"""Split Blender's sampled object timelines into synchronized, named glTF clips.
Keeps only live accessor/buffer data. No geometry or controller names are changed.
"""
import json, struct, bisect, math

def split_clips(path, ranges, fps=24):
    data=path.read_bytes();size=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+size]);offset=20+size
    blob=bytearray(data[offset+8:offset+8+struct.unpack_from('<I',data,offset)[0]])
    def read(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
        assert a['componentType']==5126 and 'byteStride' not in v and 'sparse' not in a
        n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
        return list(struct.unpack_from('<'+'f'*(a['count']*n),blob,v.get('byteOffset',0)+a.get('byteOffset',0))),n
    def add(values,kind,width):
        while len(blob)%4:blob.append(0)
        start=len(blob);blob.extend(struct.pack('<'+'f'*len(values),*values))
        view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(values)*4})
        a={'bufferView':view,'componentType':5126,'count':len(values)//width,'type':kind}
        if kind=='SCALAR':a.update(min=[min(values)],max=[max(values)])
        doc['accessors'].append(a);return len(doc['accessors'])-1
    animations=[]
    for name,(first,last) in ranges.items():
        # Blender's SCENE export retains absolute frame time (frame 1 = 1/fps).
        # Subtracting a frame pulls the preceding bind pose into contact loops.
        start,end=first/fps,last/fps;clip={'name':name,'channels':[],'samplers':[]}
        for old in doc.get('animations',[]):
            for channel in old['channels']:
                sm=old['samplers'][channel['sampler']];assert sm.get('interpolation','LINEAR')=='LINEAR'
                times,_=read(sm['input']);values,width=read(sm['output']);stride=len(values)//len(times)
                selected=[start]+[t for t in times if start+1e-5<t<end-1e-5]+[end]
                output=[]
                for t in selected:
                    hi=min(len(times)-1,bisect.bisect_right(times,t));lo=max(0,hi-1)
                    ratio=max(0,min(1,(t-times[lo])/(times[hi]-times[lo]))) if hi!=lo else 0
                    a=values[lo*stride:(lo+1)*stride];b=values[hi*stride:(hi+1)*stride]
                    if channel['target']['path']=='rotation':
                        dot=sum(x*y for x,y in zip(a,b))
                        if dot<0:b=[-x for x in b];dot=-dot
                        if dot<.9995:
                            angle=math.acos(min(1,dot));denom=math.sin(angle)
                            result=[(x*math.sin((1-ratio)*angle)+y*math.sin(ratio*angle))/denom for x,y in zip(a,b)]
                        else:
                            result=[x+(y-x)*ratio for x,y in zip(a,b)];length=math.sqrt(sum(x*x for x in result));result=[x/length for x in result]
                    else:result=[x+(y-x)*ratio for x,y in zip(a,b)]
                    output.extend(result)
                # Keep a bind channel even when it is static, but two identical
                # endpoints are enough. This preserves blend/reset behavior and
                # avoids resampling every inactive face/costume in every clip.
                if len(selected)>2 and all(abs(output[i]-output[i%stride])<1e-8 for i in range(stride,len(output))):
                    selected=[selected[0],selected[-1]];output=output[:stride]+output[-stride:]
                index=len(clip['samplers']);clip['samplers'].append({'input':add([t-start for t in selected],'SCALAR',1),'output':add(output,doc['accessors'][sm['output']]['type'],width),'interpolation':'LINEAR'})
                clip['channels'].append({'sampler':index,'target':channel['target']})
        animations.append(clip)
    doc['animations']=animations
    # Drop the full authoring timeline from the web payload; keep mesh, morph,
    # image and animation data, repacking without duplicate/dead buffer views.
    refs=[]
    for mesh in doc.get('meshes',[]):
        for p in mesh['primitives']:
            refs.extend((p['attributes'],k) for k in p['attributes'])
            if 'indices' in p:refs.append((p,'indices'))
            for target in p.get('targets',[]):refs.extend((target,k) for k in target)
    for skin in doc.get('skins',[]):
        if 'inverseBindMatrices' in skin:refs.append((skin,'inverseBindMatrices'))
    for a in animations:
        for sm in a['samplers']:refs.extend([(sm,'input'),(sm,'output')])
    used=sorted({obj[k] for obj,k in refs});remap={old:i for i,old in enumerate(used)}
    for obj,k in refs:obj[k]=remap[obj[k]]
    doc['accessors']=[doc['accessors'][i] for i in used]
    view_refs=[(a,'bufferView') for a in doc['accessors']]+[(im,'bufferView') for im in doc.get('images',[]) if 'bufferView' in im]
    used_views=sorted({o[k] for o,k in view_refs});packed=bytearray();views=[]
    for i in used_views:
        while len(packed)%4:packed.append(0)
        v=dict(doc['bufferViews'][i]);start=v.get('byteOffset',0);v['byteOffset']=len(packed)
        packed.extend(blob[start:start+v['byteLength']]);views.append(v)
    mapping={old:i for i,old in enumerate(used_views)}
    for o,k in view_refs:o[k]=mapping[o[k]]
    doc['bufferViews']=views;doc['buffers']=[{'byteLength':len(packed)}]
    while len(packed)%4:packed.append(0)
    header=json.dumps(doc,separators=(',',':')).encode()
    while len(header)%4:header+=b' '
    result=struct.pack('<III',0x46546c67,2,12+8+len(header)+8+len(packed))+struct.pack('<II',len(header),0x4e4f534a)+header+struct.pack('<II',len(packed),0x004e4942)+packed
    path.write_bytes(result)
