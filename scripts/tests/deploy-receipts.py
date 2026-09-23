"""Offline shell integration checks: never runs a real Docker daemon."""
import os, pathlib, subprocess, tempfile
script = pathlib.Path('scripts/deploy/prepare-receipts.sh').resolve()
with tempfile.TemporaryDirectory() as folder:
    root = pathlib.Path(folder)
    docker = root / 'docker'
    docker.write_text('''#!/usr/bin/env python3
import os,sys
args=sys.argv[1:]; mode=os.environ['CASE']
with open(os.environ['CALLS'],'a') as f: f.write(' '.join(args)+'\\n')
if args[:2]==['inspect','--format']:
 if 'Mounts' in args[2]:
  print('feat_debt_uploads' if mode=='mounted' else '');sys.exit(0)
 print('true');sys.exit(0)
if args[0]=='inspect':sys.exit(1 if mode=='fresh' else 0)
if args[0]=='cp':sys.exit(1 if mode in ['copy-failure','missing'] else 0)
if args[0]=='exec':sys.exit(0 if mode=='missing' else 1)
if args[0]=='run':sys.exit(1 if mode=='seed-failure' else 0)
sys.exit(0)
''')
    docker.chmod(0o755)
    mktemp = root / 'mktemp'; mktemp.write_text('#!/bin/sh\nmktemp_real=/usr/bin/mktemp\n"$mktemp_real" -d /tmp/easydebt-receipt-test.XXXXXX\n'); mktemp.chmod(0o755)
    for mode in ['mounted', 'fresh', 'existing', 'missing', 'copy-failure', 'seed-failure']:
        log=root/'calls'; log.write_text('')
        result=subprocess.run(['bash',str(script),'app:test'],env={**os.environ,'PATH':str(root)+':'+os.environ['PATH'],'CASE':mode,'CALLS':str(log)},capture_output=True,text=True)
        calls=log.read_text()
        assert (result.returncode != 0)==(mode in ['copy-failure','seed-failure']), (mode,result.stderr)
        if mode in ['mounted','fresh']: assert 'stop ' not in calls and 'run ' not in calls
        if mode=='copy-failure': assert 'run ' not in calls and 'start feat_debt_app' in calls
        if mode=='seed-failure': assert 'start feat_debt_app' in calls
        if mode=='existing': assert calls.index('stop ') < calls.index('cp ') < calls.index('run ')
print('PASS: six receipt migration safety paths; real Docker not exercised')
