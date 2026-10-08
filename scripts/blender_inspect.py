import bpy, sys, bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
path = argv[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)

print("=== OBJECTS ===")
total = 0
for o in bpy.data.objects:
    if o.type != 'MESH':
        print(f"{o.type} '{o.name}'")
        continue
    m = o.data
    total += len(m.vertices)
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = (min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))
    mx = (max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb))
    mats = [ms.name if ms else None for ms in o.material_slots]
    cols = [a.name for a in m.color_attributes]
    print(f"MESH '{o.name}' verts={len(m.vertices)} polys={len(m.polygons)} mats={mats} colors={cols}")
    print(f"   bbox_min=({mn[0]:.3f},{mn[1]:.3f},{mn[2]:.3f}) bbox_max=({mx[0]:.3f},{mx[1]:.3f},{mx[2]:.3f})")

print(f"=== TOTAL VERTS: {total} ===")
