"""Export the actual Kitty character and animation, excluding the Blender studio.
blender -b ../hellokitty3D/hello_kitty_natural.blend --python-exit-code 1 --python scripts/export_blender.py
The input .blend is never saved or modified. Requires Blender 4.3+.
"""
import bpy
import json
import subprocess, sys
import hashlib
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parents[1]/'dist'/'assets'
OUT.mkdir(parents=True,exist_ok=True)
s=bpy.context.scene
variant=s.get('plush_variant')
asset_file=OUT/'plush'/f'{variant}.glb' if variant else OUT/'hello-kitty.glb'
asset_file.parent.mkdir(parents=True,exist_ok=True)
if variant:
    bpy.data.objects['CTRL_Root']['plush_variant']=variant
    bpy.data.objects['CTRL_Root']['plush_surface']=s.get('plush_surface','legacy-curled-pile')
    if s.get('plush_ear_shape'):bpy.data.objects['CTRL_Root']['plush_ear_shape']=s['plush_ear_shape']
    bpy.data.objects['CTRL_Root']['plush_body_height']=s.get('plush_body_height',4.56808)
bpy.data.objects['CTRL_Root']['expression_library']=s.get('expression_library','legacy')
bpy.data.objects['CTRL_Root']['empty_paw_pose']=s.get('empty_paw_pose','legacy')
s.frame_set(1)
# Compatibility for earlier curled-pile source projects: omit the occluded
# inner layer beneath a hood. Corrected fleece editions have no pile meshes.
if variant in ['kitten','bunny']:
    inner=bpy.data.objects.get('Plush pile Head')
    if inner:bpy.data.objects.remove(inner,do_unlink=True)
character=list(bpy.data.collections['HELLO KITTY — editable parts'].objects)
controls=list(bpy.data.collections['ANIMATION — select controls to pose'].objects)
# Render visibility animation is not part of core glTF. Export the real wink
# geometry as morph targets instead, so the browser can play it without tricks.
eye=bpy.data.objects['Eye right'];wink=bpy.data.objects['Wink — closed eye']
for obj in [eye,wink]:
    obj.animation_data_clear();obj.hide_render=False;obj.hide_viewport=False
bpy.ops.object.select_all(action='DESELECT')
for obj in character:
    # Authoring-only prop/bouquet visibility is handled by equipment in game.
    obj.animation_data_clear();obj.hide_render=False;obj.hide_viewport=False
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    if obj.type=='CURVE':bpy.ops.object.convert(target='MESH')
    for mod in list(obj.modifiers):
        if mod.type=='SUBSURF':obj.modifiers.remove(mod)
        else:bpy.ops.object.modifier_apply(modifier=mod.name)
    if obj.type=='MESH' and obj not in [eye,wink] and not obj.data.shape_keys and not obj.get('plush_fur') and not obj.get('plush_ear_shape') and not obj.get('plush_hood_surface') and not obj.get('expression_detail') and len(obj.data.polygons)>300:
        dec=obj.modifiers.new('Web mesh reduction','DECIMATE');dec.ratio=.35
        bpy.ops.object.modifier_apply(modifier=dec.name)
    obj.select_set(False)
# Reacquire converted curves, retaining their original mesh and parent transforms.
eye=bpy.data.objects['Eye right'];wink=bpy.data.objects['Wink — closed eye']
for obj,inverted in [(eye,False),(wink,True)]:
    if not obj.data.shape_keys:obj.shape_key_add(name='Basis')
    hidden=obj.shape_key_add(name='Closed' if not inverted else 'Hidden')
    center=sum((v.co for v in obj.data.vertices),Vector())/len(obj.data.vertices)
    for v in hidden.data:v.co=center+(v.co-center)*.0001
    eye_keys=[(1,0),(73,0),(76,1),(89,1),(92,0),(144,0)]
    if variant:eye_keys += [(400,0),(406,1),(420,1),(426,0),(727,0)]
    for frame,closed in eye_keys:
        hidden.value=1-closed if inverted else closed
        hidden.keyframe_insert('value',frame=frame)
if variant:
    left=bpy.data.objects['Eye left']
    if not left.data.shape_keys:left.shape_key_add(name='Basis')
    closed=left.shape_key_add(name='JoyClosed')
    center=sum((v.co for v in left.data.vertices),Vector())/len(left.data.vertices)
    for v in closed.data:v.co=center+(v.co-center)*.0001
    arc=bpy.data.objects['Plush happy left eye'];arc.shape_key_add(name='Basis')
    arc_hidden=arc.shape_key_add(name='JoyHidden')
    center=sum((v.co for v in arc.data.vertices),Vector())/len(arc.data.vertices)
    for v in arc_hidden.data:v.co=center+(v.co-center)*.0001
    for frame,amount in [(1,0),(400,0),(406,1),(420,1),(426,0),(727,0)]:
        closed.value=amount;closed.keyframe_insert('value',frame=frame)
        arc_hidden.value=1-amount;arc_hidden.keyframe_insert('value',frame=frame)
s.frame_end=max(end for _,end in json.loads(s.get('kitty_clips','{"legacy":[1,144]}')).values())
s.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for obj in character+controls:
    # Converted objects keep their names but can be replaced by Blender.
    bpy.data.objects[obj.name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(asset_file),export_format='GLB',export_extras=True,
    use_selection=True,export_animations=True,export_animation_mode='SCENE',
    export_frame_range=True,export_force_sampling=True,export_morph=True,
    export_morph_animation=True,export_cameras=False,export_lights=False)
# Export named, synchronized clips rather than requiring callers to know frames.
sys.path.insert(0,str(Path(__file__).resolve().parent))
from glb_clips import split_clips
ranges=json.loads(s.get('kitty_clips','{"dance":[1,49],"wave":[49,97],"offer":[97,140]}'))
split_clips(asset_file,ranges,s.render.fps)

def export_collection(name,filename,clip_ranges=None):
    coll=bpy.data.collections.get(name)
    if not coll:return
    bpy.ops.object.select_all(action='DESELECT')
    for o in coll.objects:
        o.select_set(True)
        if not o.parent:o.location=(0,0,0)
    s.frame_start=1;s.frame_end=49;s.frame_set(1)
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,
        export_animations=bool(clip_ranges),export_animation_mode='SCENE',export_frame_range=True,
        export_force_sampling=True,export_cameras=False,export_lights=False)
    if clip_ranges:split_clips(OUT/filename,clip_ranges,s.render.fps)
if not variant:
    export_collection('GAME — cozy props','cozy-props.glb')
    export_collection('GAME — friends','cozy-friends.glb',{'greet':[1,49]})
source=Path(bpy.data.filepath)
try:commit=subprocess.check_output(['git','-C',str(source.parent),'rev-parse','HEAD'],text=True).strip()
except (subprocess.CalledProcessError,FileNotFoundError):commit=None
meta={'empty_paw_pose':s.get('empty_paw_pose'),'expression_library':s.get('expression_library'),'source_repository':'https://github.com/hmlim123/hellokitty3D',
      'source_commit':commit,'source_file':source.name,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'fps':s.render.fps,
      'clips':ranges,'notes':'Actual Blender character, constrained paw sockets, authored performances, friends and toy props. Studio excluded. Named clips are trimmed from the authoring timeline; wink uses glTF morph targets.'}
if variant:meta.update(variant=variant,title=s.get('plush_title'),body_height=s.get('plush_body_height'),surface=s.get('plush_surface'),ear_shape=s.get('plush_ear_shape'),notes='Actual editable plush Blender edition. Smooth matte materials without fleece normal or bump textures, stitched cheek whiskers, fused paw deformation, 19 named clips: 13 existing motions, five mouthless expressions and a relaxed-paw showcase. Sculpted empty-paw shape and happy-eye morphs. No exposed curl geometry. Studio excluded.')
(OUT/'plush'/f'{variant}-source.json' if variant else OUT/'kitty-source.json').write_text(json.dumps(meta,indent=2)+'\n')
print('BLENDER_GAME_ASSETS_EXPORTED',str(asset_file),asset_file.stat().st_size)
