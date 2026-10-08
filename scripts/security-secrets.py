import base64, json, re, subprocess, sys
from pathlib import Path
patterns={
 'private-signing-key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'supabase-secret':r'\bsb_secret_[A-Za-z0-9_-]{16,}',
 'stripe-secret':r'\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}',
 'stripe-webhook-secret':r'\bwhsec_[A-Za-z0-9]{20,}',
 'resend-secret':r'\bre_[A-Za-z0-9]{24,}',
 'github-token':r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})',
 'google-api-key':r'\bAIza[A-Za-z0-9_-]{35}',
 'openai-secret':r'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}',
}
jwt=re.compile(r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
def categories(data):
 out={k for k,p in patterns.items() if re.search(p,data)}
 for token in jwt.findall(data):
  try:
   s=token.split('.')[1]; payload=json.loads(base64.urlsafe_b64decode(s+'='*(-len(s)%4)))
   if payload.get('role')=='service_role':out.add('supabase-service-role-jwt')
  except Exception:pass
 return sorted(out)
root=Path(sys.argv[1]).resolve(); findings=[]
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0') if (root/'.git').exists() else [str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()]
for name in files:
 if not name:continue
 p=root/name
 if p.is_file():
  kinds=categories(p.read_bytes().decode('utf-8','ignore'))
  if kinds:findings.append({'scope':'working-tree','path':name,'categories':kinds})
blobs=0
if '--history' in sys.argv and (root/'.git').exists():
 objects=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=root).decode().splitlines()
 proc=subprocess.Popen(['git','cat-file','--batch'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 for entry in objects:
  oid,_,name=entry.partition(' ')
  proc.stdin.write((oid+'\n').encode());proc.stdin.flush()
  header=proc.stdout.readline().decode().split()
  if len(header)<3:continue
  data=proc.stdout.read(int(header[2]));proc.stdout.read(1)
  if header[1]!='blob':continue
  blobs+=1;kinds=categories(data.decode('utf-8','ignore'))
  if kinds:findings.append({'scope':'history','object':oid,'path':name,'categories':kinds})
 proc.stdin.close();proc.wait()
print(json.dumps({'repository':root.name,'history_blobs_scanned':blobs,'findings':findings},indent=2))
sys.exit(bool(findings))
