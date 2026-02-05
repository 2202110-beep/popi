p='frontend/src/pages/user/Dashboard.jsx'
s=open(p,'r',encoding='utf-8').read()
stack=[]
for idx,ch in enumerate(s):
    if ch=='{': stack.append(idx)
    elif ch=='}':
        if stack: stack.pop()
        else: print('Extra closing at',idx)
if stack:
    print('Unmatched opens (count):', len(stack))
    for pos in stack[-10:]:
        # find line number
        line = s.count('\n',0,pos)+1
        start = s.rfind('\n',0,pos)+1
        end = s.find('\n',pos)
        if end==-1: end=len(s)
        snippet = s[start:end]
        print('pos',pos,'line',line, snippet[:200])
else:
    print('All matched')
