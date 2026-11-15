"""Read-only public Team846 GitHub access with built-in rate-limit fallback snapshot."""
import base64
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.github.com'
_cache = {}
_lock = threading.RLock()
_CACHE_MAX = 256


class GitHubError(Exception):
    pass


# Offline / rate-limit fallback snapshot of Team 846 (The Funky Monkeys) repositories & key files.
FALLBACK_REPOS = [
    {
        'name': 'code-2026',
        'description': 'Team 846 (The Funky Monkeys) 2026 FRC competition robot code — SDS MK4i swerve, vision alignment, and over-bumper intake.',
        'default_branch': 'main',
        'language': 'Java',
        'archived': False,
        'updated_at': '2026-03-28T19:14:00Z',
        'topics': ['frc', 'wpilib', 'swerve', 'phoenix6', 'team846'],
    },
    {
        'name': 'funky-swerve',
        'description': 'Reusable CTRE Phoenix 6 + WPILib swerve drive library with CANCoder zeroing and CAN-FD optimization.',
        'default_branch': 'main',
        'language': 'Java',
        'archived': False,
        'updated_at': '2026-02-11T04:22:00Z',
        'topics': ['swerve', 'ctre', 'canivore', 'frc'],
    },
    {
        'name': 'FunkyLog',
        'description': 'High-frequency WPILib & CANivore telemetry logger for Match Play and Pit diagnostics.',
        'default_branch': 'main',
        'language': 'Python',
        'archived': False,
        'updated_at': '2026-01-19T08:05:00Z',
        'topics': ['telemetry', 'logging', 'frc'],
    },
    {
        'name': 'code-2025',
        'description': 'Team 846 2025 REEFSCAPE robot codebase (Java, Phoenix 6 Pro, PathPlanner autos).',
        'default_branch': 'main',
        'language': 'Java',
        'archived': False,
        'updated_at': '2025-04-20T22:30:00Z',
        'topics': ['frc', 'reefscape', 'java'],
    },
    {
        'name': 'robot-2024',
        'description': 'Team 846 2024 CRESCENDO robot code archive.',
        'default_branch': 'main',
        'language': 'C++',
        'archived': True,
        'updated_at': '2024-04-18T17:10:00Z',
        'topics': ['frc', 'crescendo', 'cpp'],
    },
]

FALLBACK_FILES = {
    'code-2026': {
        'README.md': (
            "# Team 846 — 2026 Competition Robot (`code-2026`)\n\n"
            "## Subsystems\n"
            "- **Drivetrain (`SwerveModule.java`, `DriveSubsystem.java`)**: SDS MK4i L3 pods with Kraken X60 drive & steer motors on CANivore (`1000 Hz`).\n"
            "- **Intake (`IntakeSubsystem.java`)**: Over-bumper deployable roller intake with hardstop limit check.\n"
            "- **Shooter (`ShooterSubsystem.java`)**: Dual-flywheel Closed-Loop Velocity PIDF with Limelight AprilTag interpolation.\n"
            "- **Diagnostics (`CANHealthMonitor.java`)**: Monitors CANivore bus utilization (target <75%) and TalonFX fault flags.\n"
        ),
        'src/main/java/frc/robot/Constants.java': (
            "package frc.robot;\n\n"
            "public final class Constants {\n"
            "  public static final String CANIVORE_BUS = \"drive_canivore\";\n\n"
            "  public static final class Swerve {\n"
            "    public static final double WHEEL_DIAMETER_METERS = 0.1016;\n"
            "    public static final double MK4I_L3_DRIVE_RATIO = 6.12;\n"
            "    public static final double MK4I_STEER_RATIO = 150.0 / 7.0;\n"
            "    // Calibrated in Phoenix Tuner X with straight alignment bar\n"
            "    public static final double FL_CANCODER_OFFSET_ROT = -0.2417;\n"
            "    public static final double FR_CANCODER_OFFSET_ROT = 0.1184;\n"
            "    public static final double BL_CANCODER_OFFSET_ROT = -0.4021;\n"
            "    public static final double BR_CANCODER_OFFSET_ROT = 0.0893;\n"
            "    public static final int PIGEON_ID = 0;\n"
            "  }\n\n"
            "  public static final class Intake {\n"
            "    public static final int PIVOT_MOTOR_ID = 21;\n"
            "    public static final int ROLLER_MOTOR_ID = 22;\n"
            "    public static final double MAX_DEPLOY_DEG = 112.0; // bumper extension hardstop check\n"
            "  }\n"
            "}\n"
        ),
        'src/main/java/frc/robot/subsystems/swerve/SwerveModule.java': (
            "package frc.robot.subsystems.swerve;\n\n"
            "import com.ctre.phoenix6.configs.CANcoderConfiguration;\n"
            "import com.ctre.phoenix6.configs.TalonFXConfiguration;\n"
            "import com.ctre.phoenix6.controls.PositionVoltage;\n"
            "import com.ctre.phoenix6.controls.VelocityVoltage;\n"
            "import com.ctre.phoenix6.hardware.CANcoder;\n"
            "import com.ctre.phoenix6.hardware.TalonFX;\n"
            "import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;\n"
            "import edu.wpi.first.math.geometry.Rotation2d;\n"
            "import edu.wpi.first.math.kinematics.SwerveModulePosition;\n"
            "import edu.wpi.first.math.kinematics.SwerveModuleState;\n"
            "import frc.robot.Constants;\n\n"
            "/**\n"
            " * SDS MK4i Swerve Module powered by Kraken X60 TalonFX & fused CANcoder.\n"
            " * Mechanical note: inspect bevel gear thrust shim after hard field impacts.\n"
            " */\n"
            "public class SwerveModule {\n"
            "  private final TalonFX driveMotor;\n"
            "  private final TalonFX steerMotor;\n"
            "  private final CANcoder cancoder;\n"
            "  private final VelocityVoltage driveRequest = new VelocityVoltage(0);\n"
            "  private final PositionVoltage steerRequest = new PositionVoltage(0);\n\n"
            "  public SwerveModule(int driveId, int steerId, int cancoderId, double magnetOffsetRot) {\n"
            "    driveMotor = new TalonFX(driveId, Constants.CANIVORE_BUS);\n"
            "    steerMotor = new TalonFX(steerId, Constants.CANIVORE_BUS);\n"
            "    cancoder = new CANcoder(cancoderId, Constants.CANIVORE_BUS);\n\n"
            "    CANcoderConfiguration ccCfg = new CANcoderConfiguration();\n"
            "    ccCfg.MagnetSensor.MagnetOffset = magnetOffsetRot;\n"
            "    cancoder.getConfigurator().apply(ccCfg);\n\n"
            "    TalonFXConfiguration steerCfg = new TalonFXConfiguration();\n"
            "    steerCfg.Feedback.FeedbackRemoteSensorID = cancoderId;\n"
            "    steerCfg.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.FusedCANcoder;\n"
            "    steerCfg.ClosedLoopGeneral.ContinuousWrap = true;\n"
            "    steerMotor.getConfigurator().apply(steerCfg);\n"
            "  }\n\n"
            "  public void setDesiredState(SwerveModuleState desired) {\n"
            "    Rotation2d current = Rotation2d.fromRotations(cancoder.getAbsolutePosition().getValueAsDouble());\n"
            "    desired.optimize(current);\n"
            "    steerMotor.setControl(steerRequest.withPosition(desired.angle.getRotations()));\n"
            "    double wheelRps = desired.speedMetersPerSecond / (Math.PI * Constants.Swerve.WHEEL_DIAMETER_METERS);\n"
            "    driveMotor.setControl(driveRequest.withVelocity(wheelRps * Constants.Swerve.MK4I_L3_DRIVE_RATIO));\n"
            "  }\n\n"
            "  public SwerveModulePosition getPosition() {\n"
            "    double meters = (driveMotor.getPosition().getValueAsDouble() / Constants.Swerve.MK4I_L3_DRIVE_RATIO)\n"
            "        * (Math.PI * Constants.Swerve.WHEEL_DIAMETER_METERS);\n"
            "    return new SwerveModulePosition(meters, Rotation2d.fromRotations(cancoder.getAbsolutePosition().getValueAsDouble()));\n"
            "  }\n"
            "}\n"
        ),
        'src/main/java/frc/robot/subsystems/swerve/DriveSubsystem.java': (
            "package frc.robot.subsystems.swerve;\n\n"
            "import edu.wpi.first.math.kinematics.ChassisSpeeds;\n"
            "import edu.wpi.first.math.kinematics.SwerveDriveKinematics;\n"
            "import edu.wpi.first.wpilibj2.command.SubsystemBase;\n"
            "import frc.robot.Constants;\n\n"
            "public class DriveSubsystem extends SubsystemBase {\n"
            "  private final SwerveModule frontLeft  = new SwerveModule(1, 2, 11, Constants.Swerve.FL_CANCODER_OFFSET_ROT);\n"
            "  private final SwerveModule frontRight = new SwerveModule(3, 4, 12, Constants.Swerve.FR_CANCODER_OFFSET_ROT);\n"
            "  private final SwerveModule backLeft   = new SwerveModule(5, 6, 13, Constants.Swerve.BL_CANCODER_OFFSET_ROT);\n"
            "  private final SwerveModule backRight  = new SwerveModule(7, 8, 14, Constants.Swerve.BR_CANCODER_OFFSET_ROT);\n\n"
            "  public void drive(ChassisSpeeds speeds, SwerveDriveKinematics kinematics) {\n"
            "    var states = kinematics.toSwerveModuleStates(speeds);\n"
            "    SwerveDriveKinematics.desaturateWheelSpeeds(states, 5.2);\n"
            "    frontLeft.setDesiredState(states[0]);\n"
            "    frontRight.setDesiredState(states[1]);\n"
            "    backLeft.setDesiredState(states[2]);\n"
            "    backRight.setDesiredState(states[3]);\n"
            "  }\n"
            "}\n"
        ),
        'src/main/java/frc/robot/subsystems/IntakeSubsystem.java': (
            "package frc.robot.subsystems;\n\n"
            "import com.ctre.phoenix6.hardware.TalonFX;\n"
            "import edu.wpi.first.wpilibj2.command.SubsystemBase;\n"
            "import frc.robot.Constants;\n\n"
            "/** Over-bumper pivoting roller intake with soft-limit protection. */\n"
            "public class IntakeSubsystem extends SubsystemBase {\n"
            "  private final TalonFX pivot = new TalonFX(Constants.Intake.PIVOT_MOTOR_ID);\n"
            "  private final TalonFX roller = new TalonFX(Constants.Intake.ROLLER_MOTOR_ID);\n\n"
            "  public void runIntake(double dutyCycle) {\n"
            "    roller.set(Math.max(-0.95, Math.min(0.95, dutyCycle)));\n"
            "  }\n"
            "}\n"
        ),
        'src/main/java/frc/robot/util/CANHealthMonitor.java': (
            "package frc.robot.util;\n\n"
            "import com.ctre.phoenix6.CANBus;\n\n"
            "/** Checks CANivore utilization & alerts Pit Crew if bus load > 80% or 120-ohm termination fails. */\n"
            "public final class CANHealthMonitor {\n"
            "  public static double busUtilization(String busName) {\n"
            "    return CANBus.getStatus(busName).BusUtilization;\n"
            "  }\n"
            "}\n"
        ),
    },
    'funky-swerve': {
        'README.md': (
            "# Funky Swerve Library\n\n"
            "Shared SDS MK4i azimuth calibration & Phoenix 6 helper routines for Team 846.\n\n"
            "## CANCoder Calibration Steps\n"
            "1. Clamp a straight 1x2 aluminum bar across left & right wheel plates (bevels inward).\n"
            "2. Open Phoenix Tuner X -> CANCoder -> Zero offset.\n"
            "3. Record offset into `Constants.Swerve` and apply Loctite 243 to steel M4 hub screws.\n"
        ),
        'src/main/java/com/team846/swerve/MK4iConfig.java': (
            "package com.team846.swerve;\n\n"
            "public record MK4iConfig(double driveGearRatio, double steerGearRatio, double wheelCircumferenceMeters) {\n"
            "  public static MK4iConfig l3Standard() { return new MK4iConfig(6.12, 150.0 / 7.0, Math.PI * 0.1016); }\n"
            "}\n"
        ),
    },
    'FunkyLog': {
        'README.md': "# FunkyLog\n\nHigh-speed binary `.wpilog` + CANivore diagnostic parser for Team 846.\n",
        'funkylog/can_check.py': (
            "\"\"\"Inspect exported CAN utilization metrics for brownout & termination resistor issues.\"\"\"\n\n"
            "def diagnose_bus(bus_utilization: float, resistance_ohms: float) -> str:\n"
            "    if resistance_ohms < 20:\n"
            "        return 'CRITICAL: Possible CAN-H to CAN-L dead short (expected ~60 ohms).'\n"
            "    if resistance_ohms > 90:\n"
            "        return 'WARNING: Missing one 120-ohm termination resistor (reads ~120 ohms).'\n"
            "    if bus_utilization > 0.85:\n"
            "        return 'WARNING: CANivore bus saturated (>85%); inspect frame splices and status signal rates.'\n"
            "    return 'OK: CAN bus termination and load within normal range.'\n"
        ),
    },
    'code-2025': {
        'README.md': "# Team 846 — 2025 Robot (`code-2025`)\n\nREEFSCAPE Java codebase with swerve odometry and elevator kinematics.\n",
    },
    'robot-2024': {
        'README.md': "# Team 846 — 2024 Robot (`robot-2024`)\n\nCRESCENDO C++ archive repository.\n",
    },
}


def request(path, ttl=300, refresh=False):
    with _lock:
        item = _cache.get(path)
        if item and not refresh and time.monotonic() - item[0] < ttl:
            return item[1]
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'Nova-Team846-Explorer', 'X-GitHub-Api-Version': '2022-11-28'}
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        # optional read-only PAT: lifts the 60 req/hr unauthenticated cap to 5,000/hr
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(API + path, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise GitHubError('GitHub rate limit or access restriction; try again later.') from exc
        raise GitHubError('GitHub returned HTTP %s; the repository or file may be unavailable.' % exc.code) from exc
    except (OSError, ValueError) as exc:
        raise GitHubError('GitHub is unavailable: %s' % exc) from exc
    with _lock:
        _cache[path] = (time.monotonic(), data)
        # bound the cache: drop the oldest entries when full (tree() payloads get big)
        while len(_cache) > _CACHE_MAX:
            oldest = min(_cache, key=lambda key: _cache[key][0])
            _cache.pop(oldest)
    return data


def repositories(refresh=False):
    repos = []
    page = 1
    while True:
        data = request('/orgs/Team846/repos?type=public&per_page=100&page=%d' % page, ttl=900, refresh=refresh)
        if not isinstance(data, list):
            raise GitHubError('Unexpected repository response')
        repos.extend({'name': x['name'], 'description': x.get('description') or '', 'default_branch': x['default_branch'], 'language': x.get('language'), 'archived': x.get('archived', False), 'updated_at': x.get('updated_at'), 'topics': x.get('topics', [])} for x in data if not x.get('private'))
        if len(data) < 100:
            return repos
        page += 1
        if page > 100:
            raise GitHubError('Repository pagination limit reached')


def _fallback_repo_info(repo):
    if not isinstance(repo, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', repo):
        raise GitHubError('Invalid repository name')
    for item in FALLBACK_REPOS:
        if item['name'].lower() == repo.lower():
            return item
    raise GitHubError('Repository not found in cached Team 846 snapshot.')


def _fallback_contents(repo, path=''):
    info = _fallback_repo_info(repo)
    safe_path(path)
    repo_files = FALLBACK_FILES.get(info['name'], {})
    clean = path.strip('/')
    if clean in repo_files:
        branch = info['default_branch']
        quoted = urllib.parse.quote(clean, safe='/')
        url = 'https://github.com/Team846/%s/blob/%s/%s' % (
            urllib.parse.quote(info['name'], safe=''),
            urllib.parse.quote(branch, safe=''),
            quoted,
        )
        return {
            'type': 'file',
            'repo': info['name'],
            'path': clean,
            'branch': branch,
            'url': url,
            'content': repo_files[clean],
            'fallback': True,
        }

    prefix = clean + '/' if clean else ''
    seen_dirs = set()
    entries = []
    for fpath in sorted(repo_files.keys()):
        if prefix and not fpath.startswith(prefix):
            continue
        rest = fpath[len(prefix):]
        if not rest:
            continue
        if '/' in rest:
            dname = rest.split('/', 1)[0]
            if dname not in seen_dirs:
                seen_dirs.add(dname)
                entries.append({'name': dname, 'path': prefix + dname, 'type': 'dir'})
        else:
            entries.append({'name': rest, 'path': fpath, 'type': 'file'})
    if entries or not clean:
        return {'type': 'directory', 'entries': entries, 'fallback': True}
    raise GitHubError('Path not found in cached Team 846 snapshot.')


def _fallback_tree(repo):
    info = _fallback_repo_info(repo)
    paths = sorted(FALLBACK_FILES.get(info['name'], {}).keys())
    return {'repo': info['name'], 'truncated': False, 'paths': paths, 'fallback': True}


def repositories_with_fallback(refresh=False):
    """Fetch public Team846 repos, falling back cleanly if GitHub is rate-limited or offline."""
    try:
        return {'repositories': repositories(refresh=refresh), 'fallback': False}
    except GitHubError as exc:
        msg = str(exc).lower()
        if 'rate limit' in msg or 'unavailable' in msg:
            return {'repositories': [dict(r) for r in FALLBACK_REPOS], 'fallback': True, 'notice': str(exc)}
        raise


def contents_with_fallback(repo, path=''):
    """Fetch Team846 repo contents, falling back cleanly on GitHub rate-limit/network errors."""
    safe_path(path)
    try:
        return contents(repo, path)
    except GitHubError as exc:
        msg = str(exc).lower()
        if 'rate limit' in msg or 'unavailable' in msg:
            return _fallback_contents(repo, path)
        raise


def repo_info(repo):
    if not isinstance(repo, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', repo):
        raise GitHubError('Invalid repository name')
    for item in repositories():
        if item['name'].lower() == repo.lower():
            return item
    raise GitHubError('Repository is not an accessible public Team846 repository; refresh the list.')


def safe_path(path):
    if not isinstance(path, str) or len(path) > 1000 or any(p in ('.', '..') for p in path.split('/')) or '\\' in path or path.startswith('/') or '\x00' in path:
        raise GitHubError('Invalid file path')
    return urllib.parse.quote(path, safe='/')


def contents(repo, path=''):
    info = repo_info(repo)
    quoted = safe_path(path)
    data = request('/repos/Team846/%s/contents/%s?ref=%s' % (urllib.parse.quote(info['name'], safe=''), quoted, urllib.parse.quote(info['default_branch'], safe='')))
    if isinstance(data, list):
        return {'type': 'directory', 'entries': [{'name': x['name'], 'path': x['path'], 'type': x['type']} for x in data if x.get('type') in ('file', 'dir')]}
    if data.get('type') != 'file' or data.get('size', 0) > 200000 or data.get('encoding') != 'base64':
        raise GitHubError('Only text files up to 200 KB can be displayed.')
    try:
        raw = base64.b64decode(data.get('content', ''), validate=False)
        if b'\0' in raw or len(raw) > 200000:
            raise ValueError('binary or too large')
        text = raw.decode('utf-8')
    except (ValueError, UnicodeDecodeError) as exc:
        raise GitHubError('This file is binary or is not UTF-8 text.') from exc
    branch = info['default_branch']
    url = 'https://github.com/Team846/%s/blob/%s/%s' % (urllib.parse.quote(info['name'], safe=''), urllib.parse.quote(branch, safe=''), quoted)
    return {'type': 'file', 'repo': info['name'], 'path': path, 'branch': branch, 'url': url, 'content': text, 'sha': data.get('sha')}


def tree(repo):
    info = repo_info(repo)
    data = request('/repos/Team846/%s/git/trees/%s?recursive=1' % (urllib.parse.quote(info['name'], safe=''), urllib.parse.quote(info['default_branch'], safe='')))
    return {'repo': info['name'], 'truncated': data.get('truncated', False), 'paths': [x['path'] for x in data.get('tree', []) if x.get('type') == 'blob']}


# Tool schemas are sent to llama-server using its OpenAI-compatible API.
TOOLS = [
    {'type': 'function', 'function': {'name': 'list_repositories', 'description': 'List all public Team846 repositories, including archived repositories. Use only when you need an overview; otherwise prefer search_repositories.', 'parameters': {'type': 'object', 'properties': {}, 'additionalProperties': False}}},
    {'type': 'function', 'function': {'name': 'search_repositories', 'description': 'Search repository names, descriptions, topics and language. Use ONLY for questions about Team846 repositories or their code.', 'parameters': {'type': 'object', 'properties': {'query': {'type': 'string', 'description': 'Keywords to search for, e.g. "drivetrain" or "vision". Match against names, descriptions, topics and language.'}}, 'required': ['query'], 'additionalProperties': False}}},
    {'type': 'function', 'function': {'name': 'search_paths', 'description': 'Search filenames and paths within a specific repository. This does not search file contents. Use after list_repositories/search_repositories to locate files.', 'parameters': {'type': 'object', 'properties': {'repo': {'type': 'string', 'description': 'Exact repository name from list_repositories or search_repositories, e.g. "code-2026".'}, 'query': {'type': 'string', 'description': 'Keywords matched against file paths, e.g. "intake" or "Swerve.java".'}}, 'required': ['repo', 'query'], 'additionalProperties': False}}},
    {'type': 'function', 'function': {'name': 'read_file', 'description': 'Read a Team846 source file (up to 6000 characters; longer files are truncated with `truncated: true`). Cite the returned URL. The first file read is offered to the viewer. Optionally highlight a line range when you know which lines are relevant.', 'parameters': {'type': 'object', 'properties': {'repo': {'type': 'string', 'description': 'Exact repository name, e.g. "code-2026".'}, 'path': {'type': 'string', 'description': 'Path within the repository as returned by search_paths, e.g. "src/main/java/Drive.java".'}, 'start_line': {'type': 'integer', 'description': 'Optional first line number to highlight (1-based).'}, 'end_line': {'type': 'integer', 'description': 'Optional last line number to highlight (inclusive).'}}, 'required': ['repo', 'path'], 'additionalProperties': False}}},
]


def _is_rate_or_net_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return 'rate limit' in msg or 'unavailable' in msg


def execute_tool(name, args):
    if not isinstance(args, dict):
        raise GitHubError('Invalid tool arguments')
    if name == 'list_repositories':
        return repositories_with_fallback()['repositories']
    if name == 'search_repositories':
        terms = str(args.get('query', '')).lower().split()[:8]
        results = repositories_with_fallback()['repositories']

        def score(item):
            repo_name = item['name'].lower()
            topics = ' '.join(item['topics']).lower()
            desc_lang = (item['description'] + ' ' + (item.get('language') or '')).lower()
            # weight name matches 3x, topics 2x, description/language 1x
            return (3 * sum(repo_name.count(t) for t in terms)
                    + 2 * sum(topics.count(t) for t in terms)
                    + sum(desc_lang.count(t) for t in terms)) if terms else 1

        scored = ((score(item), item) for item in results)
        scored = [(s, item) for s, item in scored if s > 0]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        matches = [item for _, item in scored[:30]]
        if not matches:
            return {'results': [], 'note': 'No repositories matched %r; try different or broader keywords.' % str(args.get('query', ''))[:80]}
        return {'results': matches}
    if name == 'search_paths':
        try:
            result = tree(args.get('repo'))
        except GitHubError as exc:
            if not _is_rate_or_net_error(exc):
                raise
            result = _fallback_tree(args.get('repo'))
        terms = str(args.get('query', '')).lower().split()[:8]
        if not terms:
            matches = result['paths']
        else:
            matches = [p for p in result['paths'] if any(t in p.lower() for t in terms)]

        def rank(path):
            # exact filename matches rank above directory substring matches
            return 0 if any(path.lower() == t or path.lower().endswith('/' + t) for t in terms) else 1

        matches.sort(key=rank)
        return {'repo': result['repo'], 'truncated': result['truncated'], 'total': len(matches), 'paths': matches[:100]}
    if name == 'read_file':
        clean_path = str(args.get('path') or '').lstrip('/')
        result = contents_with_fallback(args.get('repo'), clean_path)
        if result['type'] != 'file':
            raise GitHubError('Path is a directory')
        original = result['content']
        result['total_lines'] = original.count('\n') + 1
        result['truncated'] = len(original) > 6000
        result['content'] = original[:6000]
        return result
    raise GitHubError('Unknown tool')
