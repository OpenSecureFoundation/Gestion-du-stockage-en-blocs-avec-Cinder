"""
CinderAuto - Backend API Flask
Gestion automatique des snapshots OpenStack Cinder
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
import openstack
import sqlite3
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_PATH = "cinder_auto.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS snapshot_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volume_id TEXT NOT NULL,
            volume_name TEXT,
            frequency_hours INTEGER NOT NULL,
            retention_count INTEGER DEFAULT 5,
            enabled INTEGER DEFAULT 1,
            created_at TEXT,
            last_run TEXT,
            next_run TEXT,
            auth_token TEXT,
            auth_url TEXT,
            project_id TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS snapshot_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volume_id TEXT,
            volume_name TEXT,
            snapshot_id TEXT,
            snapshot_name TEXT,
            status TEXT,
            size_gb INTEGER,
            created_at TEXT,
            schedule_id INTEGER
        )
    ''')
    conn.commit()
    conn.close()

init_db()

jobstores = {'default': SQLAlchemyJobStore(url=f'sqlite:///{DB_PATH}')}
scheduler = BackgroundScheduler(jobstores=jobstores)
scheduler.start()

def get_openstack_conn(auth_url, token, project_id):
    try:
        conn = openstack.connect(
            auth_url=auth_url,
            auth_type='token',
            token=token,
            project_id=project_id,
            verify=False
        )
        return conn
    except Exception as e:
        logger.error(f"Erreur connexion OpenStack: {e}")
        return None

def create_snapshot_job(schedule_id):
    conn_db = sqlite3.connect(DB_PATH)
    c = conn_db.cursor()
    c.execute("SELECT * FROM snapshot_schedules WHERE id=? AND enabled=1", (schedule_id,))
    schedule = c.fetchone()

    if not schedule:
        conn_db.close()
        return

    cols = ['id', 'volume_id', 'volume_name', 'frequency_hours', 'retention_count',
            'enabled', 'created_at', 'last_run', 'next_run', 'auth_token', 'auth_url', 'project_id']
    s = dict(zip(cols, schedule))

    try:
        os_conn = get_openstack_conn(s['auth_url'], s['auth_token'], s['project_id'])
        if not os_conn:
            raise Exception("Impossible de se connecter à OpenStack")

        timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        snap_name = f"auto-snap-{s['volume_name'] or s['volume_id'][:8]}-{timestamp}"

        snapshot = os_conn.block_storage.create_snapshot(
            volume_id=s['volume_id'],
            name=snap_name,
            description=f"Snapshot automatique - Schedule #{schedule_id}",
            force=True
        )

        c.execute('''
            INSERT INTO snapshot_history
            (volume_id, volume_name, snapshot_id, snapshot_name, status, created_at, schedule_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (s['volume_id'], s['volume_name'], snapshot.id, snap_name,
              'available', datetime.utcnow().isoformat(), schedule_id))

        c.execute('''
            SELECT snapshot_id FROM snapshot_history
            WHERE schedule_id=? ORDER BY created_at DESC
        ''', (schedule_id,))
        all_snaps = c.fetchall()

        if len(all_snaps) > s['retention_count']:
            to_delete = all_snaps[s['retention_count']:]
            for (snap_id,) in to_delete:
                try:
                    os_conn.block_storage.delete_snapshot(snap_id)
                    c.execute("DELETE FROM snapshot_history WHERE snapshot_id=?", (snap_id,))
                except Exception as e:
                    logger.warning(f"Impossible de supprimer snapshot {snap_id}: {e}")

        c.execute("UPDATE snapshot_schedules SET last_run=? WHERE id=?",
                  (datetime.utcnow().isoformat(), schedule_id))
        conn_db.commit()
        logger.info(f"✅ Snapshot créé: {snap_name}")

    except Exception as e:
        logger.error(f"Erreur création snapshot (schedule {schedule_id}): {e}")
        c.execute('''
            INSERT INTO snapshot_history
            (volume_id, volume_name, snapshot_id, snapshot_name, status, created_at, schedule_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (s['volume_id'], s['volume_name'], 'ERROR', str(e),
              'error', datetime.utcnow().isoformat(), schedule_id))
        conn_db.commit()
    finally:
        conn_db.close()


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email', '')
    auth_url = data.get('auth_url', 'http://127.0.0.1/identity')

    if not username or not password:
        return jsonify({'success': False, 'error': 'Nom et mot de passe requis'}), 400

    try:
        admin_conn = openstack.connect(
            auth_url=auth_url,
            username='admin',
            password='admin123',
            project_name='admin',
            user_domain_name='Default',
            project_domain_name='Default',
            verify=False
        )

        existing = admin_conn.identity.find_user(username)
        if existing:
            return jsonify({'success': False, 'error': "Ce nom d'utilisateur existe déjà"}), 400

        project_name = f"project_{username}"
        project = admin_conn.identity.create_project(
            name=project_name,
            description=f"Projet de {username}",
            domain_id='default',
            enabled=True
        )

        user = admin_conn.identity.create_user(
            name=username,
            password=password,
            email=email,
            default_project_id=project.id,
            domain_id='default',
            enabled=True
        )

        member_role = admin_conn.identity.find_role('member')
        if member_role:
            admin_conn.identity.assign_project_role_to_user(
                project.id, user.id, member_role.id
            )

        return jsonify({'success': True, 'message': 'Compte créé avec succès !'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    auth_url = data.get('auth_url')
    username = data.get('username')
    password = data.get('password')
    domain_name = data.get('domain_name', 'Default')
    project_name = data.get('project_name') or f"project_{username}"

    try:
        try:
            conn = openstack.connect(
                auth_url=auth_url,
                username=username,
                password=password,
                project_name=project_name,
                user_domain_name=domain_name,
                project_domain_name=domain_name,
                verify=False
            )
            conn.authorize()
        except Exception:
            project_name = "admin"
            conn = openstack.connect(
                auth_url=auth_url,
                username=username,
                password=password,
                project_name=project_name,
                user_domain_name=domain_name,
                project_domain_name=domain_name,
                verify=False
            )
            conn.authorize()

        token = conn.auth_token
        project_id = conn.current_project_id
        user_id = conn.current_user_id

        return jsonify({
            'success': True,
            'token': token,
            'project_id': project_id,
            'user_id': user_id,
            'auth_url': auth_url,
            'username': username,
            'project_name': project_name
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 401


@app.route('/api/volumes', methods=['GET'])
def list_volumes():
    auth_url = request.headers.get('X-Auth-Url')
    token = request.headers.get('X-Auth-Token')
    project_id = request.headers.get('X-Project-Id')

    try:
        conn = get_openstack_conn(auth_url, token, project_id)
        if not conn:
            return jsonify({'error': 'Connexion OpenStack échouée'}), 500

        volumes = []
        for vol in conn.block_storage.volumes(details=True):
            db_conn = sqlite3.connect(DB_PATH)
            c = db_conn.cursor()
            c.execute("SELECT id, frequency_hours, enabled FROM snapshot_schedules WHERE volume_id=?",
                     (vol.id,))
            sched = c.fetchone()
            db_conn.close()

            volumes.append({
                'id': vol.id,
                'name': vol.name or f'Volume-{vol.id[:8]}',
                'size': vol.size,
                'status': vol.status,
                'created_at': vol.created_at,
                'description': vol.description,
                'volume_type': vol.volume_type,
                'attachments': vol.attachments or [],
                'schedule': {
                    'id': sched[0],
                    'frequency_hours': sched[1],
                    'enabled': bool(sched[2])
                } if sched else None
            })

        return jsonify({'volumes': volumes, 'count': len(volumes)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/volumes', methods=['POST'])
def create_volume():
    data = request.json
    auth_url = request.headers.get('X-Auth-Url')
    token = request.headers.get('X-Auth-Token')
    project_id = request.headers.get('X-Project-Id')

    name = data.get('name')
    size = int(data.get('size', 1))
    description = data.get('description', '')

    if not name:
        return jsonify({'error': 'Nom du volume requis'}), 400

    try:
        conn = get_openstack_conn(auth_url, token, project_id)
        volume = conn.block_storage.create_volume(
            name=name,
            size=size,
            description=description
        )
        return jsonify({
            'success': True,
            'volume_id': volume.id,
            'volume_name': volume.name,
            'message': f'Volume "{name}" créé avec succès !'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/snapshots', methods=['GET'])
def list_snapshots():
    auth_url = request.headers.get('X-Auth-Url')
    token = request.headers.get('X-Auth-Token')
    project_id = request.headers.get('X-Project-Id')
    volume_id = request.args.get('volume_id')

    try:
        conn = get_openstack_conn(auth_url, token, project_id)
        snapshots = []
        kwargs = {}
        if volume_id:
            kwargs['volume_id'] = volume_id

        for snap in conn.block_storage.snapshots(details=True, **kwargs):
            snapshots.append({
                'id': snap.id,
                'name': snap.name,
                'volume_id': snap.volume_id,
                'size': snap.size,
                'status': snap.status,
                'created_at': snap.created_at,
                'description': snap.description,
                'is_auto': str(snap.name or '').startswith('auto-snap-')
            })

        snapshots.sort(key=lambda x: x['created_at'] or '', reverse=True)
        return jsonify({'snapshots': snapshots, 'count': len(snapshots)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/schedules', methods=['GET'])
def list_schedules():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM snapshot_schedules")
    rows = c.fetchall()
    conn.close()

    cols = ['id', 'volume_id', 'volume_name', 'frequency_hours', 'retention_count',
            'enabled', 'created_at', 'last_run', 'next_run', 'auth_token', 'auth_url', 'project_id']
    schedules = []
    for row in rows:
        s = dict(zip(cols, row))
        del s['auth_token']
        schedules.append(s)

    return jsonify({'schedules': schedules})


@app.route('/api/schedules', methods=['POST'])
def create_schedule():
    data = request.json
    auth_url = request.headers.get('X-Auth-Url')
    token = request.headers.get('X-Auth-Token')
    project_id = request.headers.get('X-Project-Id')

    volume_id = data.get('volume_id')
    volume_name = data.get('volume_name', '')
    frequency_hours = int(data.get('frequency_hours', 24))
    retention_count = int(data.get('retention_count', 5))

    if not volume_id:
        return jsonify({'error': 'volume_id requis'}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id FROM snapshot_schedules WHERE volume_id=?", (volume_id,))
    existing = c.fetchone()
    now = datetime.utcnow().isoformat()

    if existing:
        schedule_id = existing[0]
        c.execute('''
            UPDATE snapshot_schedules SET
            frequency_hours=?, retention_count=?, enabled=1,
            auth_token=?, auth_url=?, project_id=?
            WHERE id=?
        ''', (frequency_hours, retention_count, token, auth_url, project_id, schedule_id))
    else:
        c.execute('''
            INSERT INTO snapshot_schedules
            (volume_id, volume_name, frequency_hours, retention_count, enabled,
             created_at, auth_token, auth_url, project_id)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
        ''', (volume_id, volume_name, frequency_hours, retention_count,
              now, token, auth_url, project_id))
        schedule_id = c.lastrowid

    conn.commit()
    conn.close()

    job_id = f"snapshot_schedule_{schedule_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    scheduler.add_job(
        func=create_snapshot_job,
        trigger='interval',
        hours=frequency_hours,
        id=job_id,
        args=[schedule_id],
        replace_existing=True,
        name=f"Snapshot auto - {volume_name or volume_id[:8]}"
    )

    return jsonify({
        'success': True,
        'schedule_id': schedule_id,
        'message': f'Snapshot automatique activé (toutes les {frequency_hours}h)'
    })


@app.route('/api/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE snapshot_schedules SET enabled=0 WHERE id=?", (schedule_id,))
    conn.commit()
    conn.close()

    job_id = f"snapshot_schedule_{schedule_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    return jsonify({'success': True, 'message': 'Planification désactivée'})


@app.route('/api/schedules/<int:schedule_id>/run-now', methods=['POST'])
def run_now(schedule_id):
    create_snapshot_job(schedule_id)
    return jsonify({'success': True, 'message': 'Snapshot en cours de création'})


@app.route('/api/restore', methods=['POST'])
def restore_snapshot():
    data = request.json
    auth_url = request.headers.get('X-Auth-Url')
    token = request.headers.get('X-Auth-Token')
    project_id = request.headers.get('X-Project-Id')

    snapshot_id = data.get('snapshot_id')
    new_volume_name = data.get('volume_name', f'restored-{snapshot_id[:8]}')

    try:
        conn = get_openstack_conn(auth_url, token, project_id)
        snapshot = conn.block_storage.get_snapshot(snapshot_id)
        new_volume = conn.block_storage.create_volume(
            name=new_volume_name,
            snapshot_id=snapshot_id,
            size=snapshot.size,
            description=f"Restauré depuis {snapshot.name} le {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}"
        )
        return jsonify({
            'success': True,
            'volume_id': new_volume.id,
            'volume_name': new_volume.name,
            'message': f'Restauration lancée. Volume "{new_volume_name}" en cours de création.'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    volume_id = request.args.get('volume_id')
    project_id = request.headers.get('X-Project-Id')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    if volume_id:
        c.execute('''
            SELECT h.* FROM snapshot_history h
            JOIN snapshot_schedules s ON h.schedule_id = s.id
            WHERE h.volume_id=? AND s.project_id=?
            ORDER BY h.created_at DESC LIMIT 50
        ''', (volume_id, project_id))
    else:
        c.execute('''
            SELECT h.* FROM snapshot_history h
            JOIN snapshot_schedules s ON h.schedule_id = s.id
            WHERE s.project_id=?
            ORDER BY h.created_at DESC LIMIT 100
        ''', (project_id,))

    rows = c.fetchall()
    conn.close()

    cols = ['id', 'volume_id', 'volume_name', 'snapshot_id', 'snapshot_name',
            'status', 'size_gb', 'created_at', 'schedule_id']
    history = [dict(zip(cols, row)) for row in rows]
    return jsonify({'history': history})


@app.route('/api/snapshots/<snapshot_id>', methods=['DELETE'])
def delete_snapshot(snapshot_id):
    auth_url = request.headers.get('X-Auth-Url')
    token = request.headers.get('X-Auth-Token')
    project_id = request.headers.get('X-Project-Id')

    try:
        conn = get_openstack_conn(auth_url, token, project_id)
        conn.block_storage.delete_snapshot(snapshot_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'scheduler_running': scheduler.running})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
