import os
import re

src_dir = r'C:/Users/DELL/.gemini/antigravity/scratch/pulse-app/src'

graph = {}

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.js'):
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, src_dir).replace('\\', '/')
            graph[rel_path] = []

            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()

            # Find relative imports
            matches = re.findall(r'from\s+[\'"](\.[^\'"]+)[\'"]', content)
            for m in matches:
                # resolve relative path
                dir_name = os.path.dirname(path)
                resolved = os.path.normpath(os.path.join(dir_name, m))
                rel_resolved = os.path.relpath(resolved, src_dir).replace('\\', '/')
                # Try extensions
                candidates = [rel_resolved, rel_resolved + '.jsx', rel_resolved + '.js', rel_resolved + '/index.js', rel_resolved + '/index.jsx']
                for cand in candidates:
                    if cand in graph or os.path.exists(os.path.join(src_dir, cand)):
                        graph[rel_path].append(cand)
                        break

# Check cycles using DFS
visited = {} # 0: unvisited, 1: visiting, 2: visited
cycles = []

def dfs(node, path):
    visited[node] = 1
    for neighbor in graph.get(node, []):
        if neighbor not in visited:
            visited[neighbor] = 0
        if visited[neighbor] == 1:
            # cycle found
            cycle_start = path.index(neighbor)
            cycles.append(path[cycle_start:] + [neighbor])
        elif visited[neighbor] == 0:
            dfs(neighbor, path + [neighbor])
    visited[node] = 2

for node in list(graph.keys()):
    if visited.get(node, 0) == 0:
        dfs(node, [node])

print(f"Total cycles found: {len(cycles)}")
for c in cycles:
    print(" -> ".join(c))
