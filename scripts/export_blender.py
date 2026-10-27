"""Export the actual Kitty character and animation, excluding the Blender studio.
blender -b ../hellokitty3D/hello_kitty_animated.blend --python-exit-code 1 --python scripts/export_blender.py
The input .blend is never saved or modified. Requires Blender 4.3+.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parents[1]/'dist'/'assets'
OUT.mkdir(parents=True,exist_ok=True)
s=bpy.context.scene
s.frame_set(1)
character=list(bpy.data.collections['HELLO KITTY — editable parts'].objects)
controls=list(bpy.data.collections['ANIMATION — select controls to pose'].objects)
# Render visibility animation is not part of core glTF. Export the real wink
# geometry as morph targets instead, so the browser can play it without tricks.
eye=bpy.data.objects['Eye right'];wink=bpy.data.objects['Wink — closed eye']
for obj in [eye,wink]:
    obj.animation_data_clear();obj.hide_render=False;obj.hide_viewport=False
bpy.ops.object.select_all(action='DESELECT')
for obj in character:
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    if obj.type=='CURVE':bpy.ops.object.convert(target='MESH')
    for mod in list(obj.modifiers):
        if mod.type=='SUBSURF':obj.modifiers.remove(mod)
        else:bpy.ops.object.modifier_apply(modifier=mod.name)
    if obj.type=='MESH' and obj not in [eye,wink] and len(obj.data.polygons)>300:
        dec=obj.modifiers.new('Web mesh reduction','DECIMATE');dec.ratio=.35
        bpy.ops.object.modifier_apply(modifier=dec.name)
    obj.select_set(False)
# Reacquire converted curves, retaining their original mesh and parent transforms.
eye=bpy.data.objects['Eye right'];wink=bpy.data.objects['Wink — closed eye']
for obj,inverted in [(eye,False),(wink,True)]:
    obj.shape_key_add(name='Basis')
    hidden=obj.shape_key_add(name='Closed' if not inverted else 'Hidden')
    center=sum((v.co for v in obj.data.vertices),Vector())/len(obj.data.vertices)
    for v in hidden.data:v.co=center+(v.co-center)*.0001
    for frame,closed in [(1,0),(73,0),(76,1),(89,1),(92,0),(144,0)]:
        hidden.value=1-closed if inverted else closed
        hidden.keyframe_insert('value',frame=frame)
s.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for obj in character+controls:
    # Converted objects keep their names but can be replaced by Blender.
    bpy.data.objects[obj.name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'hello-kitty.glb'),export_format='GLB',
    use_selection=True,export_animations=True,export_animation_mode='SCENE',
    export_frame_range=True,export_force_sampling=True,export_morph=True,
    export_morph_animation=True,export_cameras=False,export_lights=False)
meta={'source_repository':'https://github.com/hmlim123/hellokitty3D',
      'source_commit':'1fee5d514ba101055d1bb1c6e6957830aa3be646',
      'source_file':'hello_kitty_animated.blend','fps':24,'frames':[1,144],
      'notes':'Actual character meshes and control animation exported from the shared Blender model. Studio excluded; web meshes reduced. Wink visibility converted to glTF morph targets.'}
(OUT/'kitty-source.json').write_text(json.dumps(meta,indent=2)+'\n')
print('BLENDER_CHARACTER_EXPORTED', (OUT/'hello-kitty.glb').stat().st_size)
