"""Bake lightweight, static shelf miniatures from the actual Blender projects.
Run with Blender against one edition; never saves/modifies the source .blend.
"""
import bpy,hashlib,json
from pathlib import Path
from mathutils import Matrix,Vector
s=bpy.context.scene;s.frame_set(s.get("default_empty_frame",1));style=s.get('plush_variant','classic')
source=Path(bpy.data.filepath);out=Path(__file__).resolve().parents[1]/'dist/assets/shelf';out.mkdir(parents=True,exist_ok=True)
coll=bpy.data.collections['HELLO KITTY — editable parts'];graph=bpy.context.evaluated_depsgraph_get()
foot=bpy.data.objects['Foot -1'];floor=min((foot.matrix_world@Vector(c)).z for c in foot.bound_box)
scale=2.27/(s.get('plush_body_height',4.56808)if style!='classic'else 4.56808)
parts=[]
for obj in list(coll.objects):
 if obj.type not in ['MESH','CURVE']or obj.hide_render:continue
 ancestor=obj
 while ancestor and ancestor.name!='CTRL_Bouquet':ancestor=ancestor.parent
 if ancestor:continue
 evaluated=obj.evaluated_get(graph);mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=graph)
 if not mesh or not len(mesh.polygons):continue
 mesh.transform(obj.matrix_world)
 for v in mesh.vertices:v.co=Vector((v.co.x*scale,v.co.y*scale,(v.co.z-floor)*scale))
 baked=bpy.data.objects.new('Miniature '+obj.name,mesh);bpy.context.scene.collection.objects.link(baked);parts.append(baked)
 for polygon in mesh.polygons:polygon.use_smooth=True
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mini=bpy.context.object;mini.name='Shelf_'+style
# Preserve the actual palette, silhouette and props; static miniatures need no
# animation channels, morphs, rig nodes or packed portrait textures.
if len(mini.data.polygons)>3500:
 dec=mini.modifiers.new('Shelf display detail','DECIMATE');dec.ratio=min(1,4500/len(mini.data.polygons));bpy.ops.object.modifier_apply(modifier=dec.name)
mini['shelf_style']=style;mini['source_sha256']=hashlib.sha256(source.read_bytes()).hexdigest();mini['source_file']=source.name
bpy.ops.export_scene.gltf(filepath=str(out/(style+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_morph=False,export_extras=True,export_cameras=False,export_lights=False)
print('SHELF_MINIATURE_EXPORTED',style,(out/(style+'.glb')).stat().st_size,flush=True)
