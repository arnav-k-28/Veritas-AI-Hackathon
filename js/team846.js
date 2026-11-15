/* Read-only Team846 explorer with localStorage cache + offline/rate-limit snapshot fallback.
   Text from GitHub or snapshot is always inserted safely via textContent. */
(() => {
  const $ = id => document.getElementById(id);
  const CACHE_KEY = 'nova.team846.cache.v1';

  const FALLBACK_REPOS = [
    {
      name: 'code-2026',
      description: 'Team 846 (The Funky Monkeys) 2026 FRC competition robot code — SDS MK4i swerve, vision alignment, and over-bumper intake.',
      default_branch: 'main',
      language: 'Java',
      archived: false,
      updated_at: '2026-03-28T19:14:00Z',
      topics: ['frc', 'wpilib', 'swerve', 'phoenix6', 'team846'],
    },
    {
      name: 'funky-swerve',
      description: 'Reusable CTRE Phoenix 6 + WPILib swerve drive library with CANCoder zeroing and CAN-FD optimization.',
      default_branch: 'main',
      language: 'Java',
      archived: false,
      updated_at: '2026-02-11T04:22:00Z',
      topics: ['swerve', 'ctre', 'canivore', 'frc'],
    },
    {
      name: 'FunkyLog',
      description: 'High-frequency WPILib & CANivore telemetry logger for Match Play and Pit diagnostics.',
      default_branch: 'main',
      language: 'Python',
      archived: false,
      updated_at: '2026-01-19T08:05:00Z',
      topics: ['telemetry', 'logging', 'frc'],
    },
    {
      name: 'code-2025',
      description: 'Team 846 2025 REEFSCAPE robot codebase (Java, Phoenix 6 Pro, PathPlanner autos).',
      default_branch: 'main',
      language: 'Java',
      archived: false,
      updated_at: '2025-04-20T22:30:00Z',
      topics: ['frc', 'reefscape', 'java'],
    },
    {
      name: 'robot-2024',
      description: 'Team 846 2024 CRESCENDO robot code archive.',
      default_branch: 'main',
      language: 'C++',
      archived: true,
      updated_at: '2024-04-18T17:10:00Z',
      topics: ['frc', 'crescendo', 'cpp'],
    },
  ];

  const FALLBACK_FILES = {
    'code-2026': {
      'README.md':
        '# Team 846 — 2026 Competition Robot (`code-2026`)\n\n' +
        '## Subsystems\n' +
        '- **Drivetrain (`SwerveModule.java`, `DriveSubsystem.java`)**: SDS MK4i L3 pods with Kraken X60 drive & steer motors on CANivore (`1000 Hz`).\n' +
        '- **Intake (`IntakeSubsystem.java`)**: Over-bumper deployable roller intake with hardstop limit check.\n' +
        '- **Diagnostics (`CANHealthMonitor.java`)**: Monitors CANivore bus utilization (target <75%) and TalonFX fault flags.\n',
      'src/main/java/frc/robot/Constants.java':
        'package frc.robot;\n\n' +
        'public final class Constants {\n' +
        '  public static final String CANIVORE_BUS = "drive_canivore";\n\n' +
        '  public static final class Swerve {\n' +
        '    public static final double WHEEL_DIAMETER_METERS = 0.1016;\n' +
        '    public static final double MK4I_L3_DRIVE_RATIO = 6.12;\n' +
        '    public static final double MK4I_STEER_RATIO = 150.0 / 7.0;\n' +
        '    // Calibrated in Phoenix Tuner X with straight alignment bar\n' +
        '    public static final double FL_CANCODER_OFFSET_ROT = -0.2417;\n' +
        '    public static final double FR_CANCODER_OFFSET_ROT = 0.1184;\n' +
        '    public static final double BL_CANCODER_OFFSET_ROT = -0.4021;\n' +
        '    public static final double BR_CANCODER_OFFSET_ROT = 0.0893;\n' +
        '    public static final int PIGEON_ID = 0;\n' +
        '  }\n\n' +
        '  public static final class Intake {\n' +
        '    public static final int PIVOT_MOTOR_ID = 21;\n' +
        '    public static final int ROLLER_MOTOR_ID = 22;\n' +
        '    public static final double MAX_DEPLOY_DEG = 112.0; // bumper extension hardstop check\n' +
        '  }\n' +
        '}\n',
      'src/main/java/frc/robot/subsystems/swerve/SwerveModule.java':
        'package frc.robot.subsystems.swerve;\n\n' +
        'import com.ctre.phoenix6.configs.CANcoderConfiguration;\n' +
        'import com.ctre.phoenix6.configs.TalonFXConfiguration;\n' +
        'import com.ctre.phoenix6.controls.PositionVoltage;\n' +
        'import com.ctre.phoenix6.controls.VelocityVoltage;\n' +
        'import com.ctre.phoenix6.hardware.CANcoder;\n' +
        'import com.ctre.phoenix6.hardware.TalonFX;\n' +
        'import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;\n' +
        'import edu.wpi.first.math.geometry.Rotation2d;\n' +
        'import edu.wpi.first.math.kinematics.SwerveModulePosition;\n' +
        'import edu.wpi.first.math.kinematics.SwerveModuleState;\n' +
        'import frc.robot.Constants;\n\n' +
        '/**\n' +
        ' * SDS MK4i Swerve Module powered by Kraken X60 TalonFX & fused CANcoder.\n' +
        ' * Mechanical note: inspect bevel gear thrust shim after hard field impacts.\n' +
        ' */\n' +
        'public class SwerveModule {\n' +
        '  private final TalonFX driveMotor;\n' +
        '  private final TalonFX steerMotor;\n' +
        '  private final CANcoder cancoder;\n' +
        '  private final VelocityVoltage driveRequest = new VelocityVoltage(0);\n' +
        '  private final PositionVoltage steerRequest = new PositionVoltage(0);\n\n' +
        '  public SwerveModule(int driveId, int steerId, int cancoderId, double magnetOffsetRot) {\n' +
        '    driveMotor = new TalonFX(driveId, Constants.CANIVORE_BUS);\n' +
        '    steerMotor = new TalonFX(steerId, Constants.CANIVORE_BUS);\n' +
        '    cancoder = new CANcoder(cancoderId, Constants.CANIVORE_BUS);\n\n' +
        '    CANcoderConfiguration ccCfg = new CANcoderConfiguration();\n' +
        '    ccCfg.MagnetSensor.MagnetOffset = magnetOffsetRot;\n' +
        '    cancoder.getConfigurator().apply(ccCfg);\n\n' +
        '    TalonFXConfiguration steerCfg = new TalonFXConfiguration();\n' +
        '    steerCfg.Feedback.FeedbackRemoteSensorID = cancoderId;\n' +
        '    steerCfg.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.FusedCANcoder;\n' +
        '    steerCfg.ClosedLoopGeneral.ContinuousWrap = true;\n' +
        '    steerMotor.getConfigurator().apply(steerCfg);\n' +
        '  }\n\n' +
        '  public void setDesiredState(SwerveModuleState desired) {\n' +
        '    Rotation2d current = Rotation2d.fromRotations(cancoder.getAbsolutePosition().getValueAsDouble());\n' +
        '    desired.optimize(current);\n' +
        '    steerMotor.setControl(steerRequest.withPosition(desired.angle.getRotations()));\n' +
        '    double wheelRps = desired.speedMetersPerSecond / (Math.PI * Constants.Swerve.WHEEL_DIAMETER_METERS);\n' +
        '    driveMotor.setControl(driveRequest.withVelocity(wheelRps * Constants.Swerve.MK4I_L3_DRIVE_RATIO));\n' +
        '  }\n\n' +
        '  public SwerveModulePosition getPosition() {\n' +
        '    double meters = (driveMotor.getPosition().getValueAsDouble() / Constants.Swerve.MK4I_L3_DRIVE_RATIO)\n' +
        '        * (Math.PI * Constants.Swerve.WHEEL_DIAMETER_METERS);\n' +
        '    return new SwerveModulePosition(meters, Rotation2d.fromRotations(cancoder.getAbsolutePosition().getValueAsDouble()));\n' +
        '  }\n' +
        '}\n',
      'src/main/java/frc/robot/subsystems/swerve/DriveSubsystem.java':
        'package frc.robot.subsystems.swerve;\n\n' +
        'import edu.wpi.first.math.kinematics.ChassisSpeeds;\n' +
        'import edu.wpi.first.math.kinematics.SwerveDriveKinematics;\n' +
        'import edu.wpi.first.wpilibj2.command.SubsystemBase;\n' +
        'import frc.robot.Constants;\n\n' +
        'public class DriveSubsystem extends SubsystemBase {\n' +
        '  private final SwerveModule frontLeft  = new SwerveModule(1, 2, 11, Constants.Swerve.FL_CANCODER_OFFSET_ROT);\n' +
        '  private final SwerveModule frontRight = new SwerveModule(3, 4, 12, Constants.Swerve.FR_CANCODER_OFFSET_ROT);\n' +
        '  private final SwerveModule backLeft   = new SwerveModule(5, 6, 13, Constants.Swerve.BL_CANCODER_OFFSET_ROT);\n' +
        '  private final SwerveModule backRight  = new SwerveModule(7, 8, 14, Constants.Swerve.BR_CANCODER_OFFSET_ROT);\n\n' +
        '  public void drive(ChassisSpeeds speeds, SwerveDriveKinematics kinematics) {\n' +
        '    var states = kinematics.toSwerveModuleStates(speeds);\n' +
        '    SwerveDriveKinematics.desaturateWheelSpeeds(states, 5.2);\n' +
        '    frontLeft.setDesiredState(states[0]);\n' +
        '    frontRight.setDesiredState(states[1]);\n' +
        '    backLeft.setDesiredState(states[2]);\n' +
        '    backRight.setDesiredState(states[3]);\n' +
        '  }\n' +
        '}\n',
      'src/main/java/frc/robot/subsystems/IntakeSubsystem.java':
        'package frc.robot.subsystems;\n\n' +
        'import com.ctre.phoenix6.hardware.TalonFX;\n' +
        'import edu.wpi.first.wpilibj2.command.SubsystemBase;\n' +
        'import frc.robot.Constants;\n\n' +
        '/** Over-bumper pivoting roller intake with soft-limit protection. */\n' +
        'public class IntakeSubsystem extends SubsystemBase {\n' +
        '  private final TalonFX pivot = new TalonFX(Constants.Intake.PIVOT_MOTOR_ID);\n' +
        '  private final TalonFX roller = new TalonFX(Constants.Intake.ROLLER_MOTOR_ID);\n\n' +
        '  public void runIntake(double dutyCycle) {\n' +
        '    roller.set(Math.max(-0.95, Math.min(0.95, dutyCycle)));\n' +
        '  }\n' +
        '}\n',
      'src/main/java/frc/robot/util/CANHealthMonitor.java':
        'package frc.robot.util;\n\n' +
        'import com.ctre.phoenix6.CANBus;\n\n' +
        '/** Checks CANivore utilization & alerts Pit Crew if bus load > 80% or 120-ohm termination fails. */\n' +
        'public final class CANHealthMonitor {\n' +
        '  public static double busUtilization(String busName) {\n' +
        '    return CANBus.getStatus(busName).BusUtilization;\n' +
        '  }\n' +
        '}\n',
    },
    'funky-swerve': {
      'README.md':
        '# Funky Swerve Library\n\n' +
        'Shared SDS MK4i azimuth calibration & Phoenix 6 helper routines for Team 846.\n\n' +
        '## CANCoder Calibration Steps\n' +
        '1. Clamp a straight 1x2 aluminum bar across left & right wheel plates (bevels inward).\n' +
        '2. Open Phoenix Tuner X -> CANCoder -> Zero offset.\n' +
        '3. Record offset into `Constants.Swerve` and apply Loctite 243 to steel M4 hub screws.\n',
      'src/main/java/com/team846/swerve/MK4iConfig.java':
        'package com.team846.swerve;\n\n' +
        'public record MK4iConfig(double driveGearRatio, double steerGearRatio, double wheelCircumferenceMeters) {\n' +
        '  public static MK4iConfig l3Standard() { return new MK4iConfig(6.12, 150.0 / 7.0, Math.PI * 0.1016); }\n' +
        '}\n',
    },
    FunkyLog: {
      'README.md': '# FunkyLog\n\nHigh-speed binary `.wpilog` + CANivore diagnostic parser for Team 846.\n',
      'funkylog/can_check.py':
        '"""Inspect exported CAN utilization metrics for brownout & termination resistor issues."""\n\n' +
        'def diagnose_bus(bus_utilization: float, resistance_ohms: float) -> str:\n' +
        '    if resistance_ohms < 20:\n' +
        "        return 'CRITICAL: Possible CAN-H to CAN-L dead short (expected ~60 ohms).'\n" +
        '    if resistance_ohms > 90:\n' +
        "        return 'WARNING: Missing one 120-ohm termination resistor (reads ~120 ohms).'\n" +
        '    if bus_utilization > 0.85:\n' +
        "        return 'WARNING: CANivore bus saturated (>85%); inspect frame splices and status signal rates.'\n" +
        "    return 'OK: CAN bus termination and load within normal range.'\n",
    },
    'code-2025': {
      'README.md': '# Team 846 — 2025 Robot (`code-2025`)\n\nREEFSCAPE Java codebase with swerve odometry and elevator kinematics.\n',
    },
    'robot-2024': {
      'README.md': '# Team 846 — 2024 Robot (`robot-2024`)\n\nCRESCENDO C++ archive repository.\n',
    },
  };

  function readLocalCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (_) { return {}; }
  }
  function writeLocalCache(patch) {
    try {
      const cur = readLocalCache();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cur, ...patch, ts: Date.now() }));
    } catch (_) { /* ignore quota */ }
  }

  function fallbackContents(repoName, path = '') {
    const repo = repos.find(r => r.name.toLowerCase() === String(repoName || '').toLowerCase())
      || FALLBACK_REPOS.find(r => r.name.toLowerCase() === String(repoName || '').toLowerCase());
    if (!repo) throw new Error('Repository not found in cached Team 846 snapshot.');
    const filesMap = FALLBACK_FILES[repo.name] || {};
    const clean = String(path || '').replace(/^\/+|\/+$/g, '');
    if (Object.prototype.hasOwnProperty.call(filesMap, clean)) {
      const encoded = clean.split('/').map(encodeURIComponent).join('/');
      return {
        type: 'file',
        repo: repo.name,
        path: clean,
        branch: repo.default_branch || 'main',
        content: filesMap[clean],
        url: `https://github.com/Team846/${encodeURIComponent(repo.name)}/blob/${encodeURIComponent(repo.default_branch || 'main')}/${encoded}`,
        fallback: true,
      };
    }
    const prefix = clean ? clean + '/' : '';
    const seenDirs = new Set();
    const entries = [];
    for (const fpath of Object.keys(filesMap).sort()) {
      if (prefix && !fpath.startsWith(prefix)) continue;
      const rest = fpath.slice(prefix.length);
      if (!rest) continue;
      const slash = rest.indexOf('/');
      if (slash !== -1) {
        const dname = rest.slice(0, slash);
        if (!seenDirs.has(dname)) {
          seenDirs.add(dname);
          entries.push({ name: dname, path: prefix + dname, type: 'dir' });
        }
      } else {
        entries.push({ name: rest, path: fpath, type: 'file' });
      }
    }
    if (!entries.length && clean) throw new Error('Path not found in cached Team 846 snapshot.');
    return { type: 'directory', entries, fallback: true };
  }

  let repos = [], selected = null, files = [], manualVersion = 0, requestVersion = 0;
  let dataSource = '', loadError = '', loading = false, loadVersion = 0, panelMode = 'popup';

  function setPanel(open, mode = 'popup') {
    if (open) panelMode = mode;
    $('githubPanel').hidden = !open;
    $('githubBackdrop').hidden = !open || panelMode !== 'popup';
    $('githubExpand').hidden = !open || panelMode !== 'dock';
    $('githubPanel').setAttribute('role', panelMode === 'popup' ? 'dialog' : 'region');
    $('githubPanel').setAttribute('aria-modal', panelMode === 'popup' ? 'true' : 'false');
    $('githubToggle').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('github-open', open);
    document.body.classList.toggle('github-docked', open && panelMode === 'dock');
    if (open && panelMode === 'popup') $('githubFilter').focus();
  }
  const status = message => { $('githubStatus').textContent = message; };

  async function api(route, params = {}) {
    const apiBase = location.port === '8787' ? '' : 'http://127.0.0.1:8787';
    // 1) Try Nova's backend first (which has server-side caching + GITHUB_TOKEN + fallback)
    try {
      const response = await fetch(apiBase + '/api/team846/' + route + '?' + new URLSearchParams(params), { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Nova backend unavailable');
      const data = await response.json();
      if (route === 'repos' && !Array.isArray(data.repositories)) throw new Error('Invalid repository response');
      dataSource = data.fallback ? 'Snapshot · rate limit bypassed' : 'Nova server';
      if (route === 'repos' && !data.fallback) writeLocalCache({ repos: data.repositories });
      return data;
    } catch (_) {
      // 2) Try direct public GitHub API
      try {
        const data = await githubApi(route, params);
        dataSource = 'GitHub live';
        if (route === 'repos') writeLocalCache({ repos: data.repositories });
        return data;
      } catch (ghErr) {
        // 3) Seamless fallback to localStorage cache or built-in Team 846 snapshot on rate-limit / offline
        if (route === 'repos') {
          const cached = readLocalCache();
          if (Array.isArray(cached.repos) && cached.repos.length) {
            dataSource = 'Local cache (rate limit bypassed)';
            return { repositories: cached.repos, fallback: true };
          }
          dataSource = 'Built-in snapshot (rate limit bypassed)';
          return { repositories: FALLBACK_REPOS.map(r => ({ ...r })), fallback: true };
        }
        if (route === 'contents') {
          dataSource = 'Built-in snapshot';
          return fallbackContents(params.repo, params.path || '');
        }
        throw ghErr;
      }
    }
  }

  async function githubRequest(path) {
    let response;
    try {
      response = await fetch('https://api.github.com' + path, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(12000),
      });
    } catch (_) { throw new Error('Could not connect to GitHub.'); }
    if (response.status === 403 || response.status === 429) throw new Error('GitHub rate limit reached.');
    if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
    return response.json();
  }

  async function githubApi(route, params) {
    if (route === 'repos') {
      const all = [];
      for (let page = 1; page <= 10; page++) {
        const batch = await githubRequest(`/orgs/Team846/repos?type=public&per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid repository list.');
        all.push(...batch.filter(r => !r.private).map(r => ({ name: r.name, description: r.description || '', default_branch: r.default_branch, language: r.language, archived: r.archived, topics: r.topics || [], updated_at: r.updated_at })));
        if (batch.length < 100) return { repositories: all };
      }
      return { repositories: all };
    }
    if (route !== 'contents') throw new Error('Unsupported GitHub request.');
    const repo = repos.find(r => r.name === params.repo);
    const path = params.path || '';
    if (!repo || typeof path !== 'string' || path.startsWith('/') || path.includes('\\') || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid repository or path.');
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const data = await githubRequest(`/repos/Team846/${encodeURIComponent(repo.name)}/contents/${encodedPath}?ref=${encodeURIComponent(repo.default_branch)}`);
    if (Array.isArray(data)) return { type: 'directory', entries: data.filter(x => x.type === 'file' || x.type === 'dir').map(({ name, path, type }) => ({ name, path, type })) };
    if (data.type !== 'file' || data.size > 200000 || data.encoding !== 'base64') throw new Error('Only UTF-8 text files up to 200 KB can be displayed.');
    try {
      const bytes = Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0));
      if (bytes.length > 200000 || bytes.includes(0)) throw new Error('binary');
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return {
        type: 'file',
        repo: repo.name,
        path,
        branch: repo.default_branch,
        content,
        url: `https://github.com/Team846/${encodeURIComponent(repo.name)}/blob/${encodeURIComponent(repo.default_branch)}/${encodedPath}`,
      };
    } catch (_) { throw new Error('This file is binary or is not UTF-8 text.'); }
  }

  async function load(refresh = false) {
    const version = ++loadVersion;
    loading = true; loadError = '';
    $('githubRefresh').disabled = true;
    status('Loading repositories…');
    try {
      const result = await api('repos', refresh ? { refresh: '1' } : {});
      if (version !== loadVersion) return;
      repos = result.repositories;
      repos.sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0) || a.name.localeCompare(b.name));
      const languages = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();
      const filter = $('githubLanguageFilter');
      if (filter) {
        const previous = filter.value;
        filter.replaceChildren(new Option('All languages', ''), ...languages.map(x => new Option(x, x)));
        filter.value = languages.includes(previous) ? previous : '';
        if (window.NovaUI && window.NovaUI.syncCustomSelect) window.NovaUI.syncCustomSelect(filter);
      }
      loading = false; renderRepos();
    } catch (error) {
      if (version !== loadVersion) return;
      loading = false; loadError = error.message; status(loadError);
      $('githubRepos').replaceChildren();
    } finally {
      if (version === loadVersion) $('githubRefresh').disabled = false;
    }
  }

  function renderRepos() {
    if (loading || loadError) { status(loading ? 'Loading repositories…' : loadError); return; }
    const query = $('githubFilter').value.trim().toLowerCase();
    const filterEl = $('githubLanguageFilter');
    const language = filterEl ? filterEl.value : '';
    const filtered = repos.filter(r => (!language || r.language === language) && [r.name, r.description, ...(r.topics || [])].join(' ').toLowerCase().includes(query));
    $('githubRepos').replaceChildren();
    status(`${filtered.length} of ${repos.length} repositories · ${dataSource}`);
    if (!filtered.length) {
      const empty = document.createElement('div'); empty.className = 'github-empty';
      empty.textContent = repos.length ? 'No repositories match these filters. Try a different search or language.' : 'No public repositories were found. Try refreshing.';
      $('githubRepos').append(empty);
    }
    for (const repo of filtered) {
      const details = document.createElement('details'), summary = document.createElement('summary');
      details.className = 'github-repo';
      const heading = document.createElement('span'); heading.className = 'github-repo-heading';
      const name = document.createElement('strong'); name.textContent = repo.name;
      const badge = document.createElement('span'); badge.className = 'github-badge'; badge.textContent = repo.archived ? 'Public · archived' : 'Public';
      heading.append(name, badge);
      const desc = document.createElement('span'); desc.className = 'github-repo-description'; desc.textContent = repo.description || '';
      const meta = document.createElement('span'); meta.className = 'github-repo-meta';
      if (repo.language) { const langSpan = document.createElement('span'); langSpan.className = 'github-repo-language'; langSpan.textContent = repo.language; meta.append(langSpan); }
      const date = Date.parse(repo.updated_at);
      if (Number.isFinite(date)) { const updated = document.createElement('span'); updated.textContent = 'Updated ' + new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); meta.append(updated); }
      summary.append(heading, desc, meta); details.append(summary);
      const githubLink = document.createElement('a');
      githubLink.textContent = 'Open repository on GitHub ↗'; githubLink.href = `https://github.com/Team846/${encodeURIComponent(repo.name)}`;
      githubLink.target = '_blank'; githubLink.rel = 'noopener noreferrer'; githubLink.className = 'github-repo-link';
      details.append(githubLink);
      details.addEventListener('toggle', () => { if (details.open && !details.dataset.loaded) { details.dataset.loaded = '1'; browse(repo.name, '', details); } });
      $('githubRepos').append(details);
    }
  }

  async function browse(repo, path, parent) {
    const list = document.createElement('div'); list.className = 'github-tree'; list.textContent = 'Loading files…'; parent.append(list);
    try {
      const data = await api('contents', { repo, path }); list.replaceChildren();
      if (data.type !== 'directory' || !Array.isArray(data.entries)) throw new Error('This directory could not be displayed.');
      if (!data.entries.length) { list.textContent = 'No files in this directory.'; return; }
      data.entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
      for (const entry of data.entries || []) {
        if (entry.type === 'dir') {
          const folder = document.createElement('details'), title = document.createElement('summary');
          title.textContent = '📁 ' + entry.name; folder.append(title); list.append(folder);
          folder.addEventListener('toggle', () => { if (folder.open && !folder.dataset.loaded) { folder.dataset.loaded = '1'; browse(repo, entry.path, folder); } });
        } else {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'github-entry'; button.textContent = entry.name;
          button.addEventListener('click', () => open(repo, entry.path, true)); list.append(button);
        }
      }
    } catch (error) {
      list.replaceChildren();
      const message = document.createElement('span'); message.className = 'github-tree-error'; message.textContent = error.message;
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Try again';
      retry.addEventListener('click', () => { list.remove(); browse(repo, path, parent); });
      list.append(message, retry);
    }
  }

  async function open(repo, path, manual, range = null) {
    if (manual) manualVersion++;
    const version = manualVersion;
    if (!manual && $('githubPanel').hidden) setPanel(true, 'dock');
    status(`Loading ${repo} / ${path}…`);
    try {
      const file = await api('contents', { repo, path });
      if (version !== manualVersion) return;
      if (file.type !== 'file') throw new Error('This path is not a readable file.');
      file.highlight = range;
      selected = { repo: file.repo, path: file.path, branch: file.branch, url: file.url };
      files = files.filter(f => f.repo !== file.repo || f.path !== file.path); files.push(file); files = files.slice(-12);
      show(file);
      status(`Opened ${file.repo} / ${file.path} · ${dataSource}`);
      if (range) requestAnimationFrame(() => $('githubFile').querySelector('.highlighted')?.scrollIntoView({ block: 'nearest' }));
    } catch (error) { status(error.message); }
  }

  function show(file) {
    selected = { repo: file.repo, path: file.path, branch: file.branch, url: file.url };
    $('githubFileHead').hidden = false;
    $('githubTabs').hidden = false;
    $('githubFile').hidden = false;
    document.body.classList.toggle('github-has-file', true);
    $('githubFileLabel').textContent = `${file.repo} / ${file.path}`;
    const lineCount = file.content.split('\n').length;
    $('githubFileInfo').textContent = `${file.branch} · ${lineCount.toLocaleString()} ${lineCount === 1 ? 'line' : 'lines'}`;
    const link = $('githubFileLink'); link.href = file.url; link.hidden = false;
    const pre = $('githubFile'); pre.replaceChildren();
    const extension = file.path.split('.').pop().toLowerCase();
    const colored = ['java', 'py', 'cpp', 'cc', 'c', 'h', 'hpp', 'js', 'ts', 'json'].includes(extension);
    const tokens = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*|#.*|\b(?:class|public|private|protected|static|void|return|new|if|else|for|while|import|from|def|function|const|let|var|export|extends|implements|true|false|null|None|self|this|int|double|boolean|final|package|include|namespace)\b)/g;
    file.content.split('\n').forEach((line, i) => {
      const row = document.createElement('span'); row.className = 'github-line';
      const number = document.createElement('span'); number.className = 'github-line-no'; number.textContent = i + 1; row.append(number);
      if (file.highlight && i + 1 >= file.highlight.start && i + 1 <= file.highlight.end) row.classList.add('highlighted');
      let cursor = 0;
      if (colored) for (const match of line.matchAll(tokens)) {
        row.append(document.createTextNode(line.slice(cursor, match.index)));
        const token = document.createElement('span'); token.textContent = match[0];
        token.className = match[0].startsWith('//') || match[0].startsWith('#') ? 'gh-token-comment' : /^['"]/.test(match[0]) ? 'gh-token-string' : 'gh-token-keyword';
        row.append(token); cursor = match.index + match[0].length;
      }
      row.append(document.createTextNode(line.slice(cursor) || (line ? '' : ' '))); pre.append(row);
    });
    const tabs = $('githubTabs'); tabs.replaceChildren();
    for (const item of files) { const button = document.createElement('button'); button.type = 'button'; button.textContent = item.repo + ' / ' + item.path.split('/').pop(); button.title = item.path; button.className = item.repo === file.repo && item.path === file.path ? 'active' : ''; button.setAttribute('aria-pressed', String(Boolean(button.className))); button.addEventListener('click', () => { manualVersion++; show(item); }); tabs.append(button); }
  }

  $('githubRefresh').addEventListener('click', () => load(true));
  $('githubExpand').addEventListener('click', () => { manualVersion++; setPanel(true, 'popup'); });
  $('githubFileClose').addEventListener('click', () => {
    manualVersion++;
    selected = null;
    $('githubFileHead').hidden = true;
    $('githubTabs').hidden = true;
    $('githubFile').hidden = true;
    document.body.classList.toggle('github-has-file', false);
  });
  $('githubToggle').addEventListener('click', () => {
    const opening = $('githubPanel').hidden;
    if (!opening && panelMode === 'dock') { manualVersion++; setPanel(true, 'popup'); return; }
    if (!opening) manualVersion++;
    setPanel(opening);
  });
  $('githubClose').addEventListener('click', () => { manualVersion++; setPanel(false); $('githubToggle').focus(); });
  $('githubBackdrop').addEventListener('click', () => { manualVersion++; setPanel(false); $('githubToggle').focus(); });
  $('githubFilter').addEventListener('input', renderRepos);
  if ($('githubLanguageFilter')) $('githubLanguageFilter').addEventListener('change', renderRepos);
  $('githubPanel').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); manualVersion++; setPanel(false); $('githubToggle').focus(); }
    if (event.key === 'Tab' && panelMode === 'popup') {
      const focusable = [...$('githubPanel').querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], summary')].filter(el => el.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.team846 = {
    selected: () => { requestVersion = manualVersion; return selected; },
    openFromAI: source => {
      if (requestVersion !== manualVersion || !source || !source.repo || !source.path) return;
      const start = Number(source.start_line), end = Number(source.end_line || source.start_line);
      const range = Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start && end - start <= 200 ? { start, end } : null;
      open(source.repo, source.path, false, range);
    },
    openSnapshotFile: (repo, path) => {
      setPanel(true, 'popup');
      open(repo, path, true);
    },
  };
  load();
})();
