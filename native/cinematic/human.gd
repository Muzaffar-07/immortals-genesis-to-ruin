extends ImmortalAvatar
class_name HumanAvatar

var action_left := 0.0
var dead := false
var clips := {}
var face_meshes: Array[MeshInstance3D] = []
var speech_strength := 0.0
var speech_clock := 0.0
var blink_clock := 2.7
var stance := "idle"
var face_skeleton: Skeleton3D
var head_bone := -1
static var pore_map: NoiseTexture2D

func configure_cast(role: String) -> void:
	process_mode=Node.PROCESS_MODE_ALWAYS
	process_priority=20
	var path := "res://assets/cast/"+role+".glb"
	if not scenes.has(path): scenes[path] = load(path)
	model = scenes[path].instantiate()
	add_child(model)
	animation = find_animation(model)
	for clip in animation.get_animation_list():
		var key: String = clip.to_lower()
		for pair in [["idle","idle"],["walk","walk"],["run","run"],["jab","jab"],["cross","cross"],["hook","hook"],["punch combo","combo"],["front kick","kick"],["roundhouse","roundhouse"],["block","block"],["hit","hit"],["knockdown","knockdown"],["get up","recover"],["death","death"],["talk","talk"],["rifle fire","shoot"],["rifle aim","aim"],["fighting stance","guard"],["side dodge left","evade_left"],["side dodge right","evade_right"],["jump start","jump_start"],["jump (in air)","jump_air"],["jump land","jump_land"]]:
			if key.begins_with(pair[0]): clips[pair[1]] = clip
		if key.contains("loop") or key in ["idle","walk","run"]: animation.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	play("idle")
	animation.advance(0)
	for skeleton in model.find_children("*","Skeleton3D",true,false):
		var bone: int=skeleton.find_bone("Head")
		if bone>=0:
			face_skeleton=skeleton
			head_bone=bone
			break
	for mesh in model.find_children("*","MeshInstance3D",true,false):
		if mesh.get_blend_shape_count()>0: face_meshes.append(mesh)
		if DisplayServer.get_name()!="headless": refine_materials(mesh)

func face_position() -> Vector3:
	if is_instance_valid(face_skeleton) and head_bone>=0:
		return face_skeleton.global_transform*face_skeleton.get_bone_global_pose(head_bone).origin+Vector3.UP*0.06
	return global_position+Vector3.UP*1.55

func refine_materials(mesh: MeshInstance3D) -> void:
	if pore_map==null:
		pore_map=NoiseTexture2D.new()
		pore_map.width=256; pore_map.height=256
		pore_map.seamless=true; pore_map.as_normal_map=true; pore_map.bump_strength=0.3
		var noise := FastNoiseLite.new()
		noise.seed=17; noise.frequency=0.18
		pore_map.noise=noise
	for surface in mesh.mesh.get_surface_count():
		var source := mesh.get_active_material(surface) as BaseMaterial3D
		if source==null: continue
		var name := source.resource_name.to_lower()
		if name=="skin" and source.albedo_texture!=null:
			var skin := ShaderMaterial.new()
			skin.shader=load("res://cinematic/skin.gdshader")
			skin.set_shader_parameter("complexion",source.albedo_texture)
			skin.set_shader_parameter("oil_map",source.roughness_texture)
			skin.set_shader_parameter("tone",source.albedo_color)
			skin.set_shader_parameter("pores",pore_map)
			mesh.set_surface_override_material(surface,skin)
		else:
			var material := source.duplicate() as BaseMaterial3D
			material.texture_filter=BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
			if name.contains("eye") and not name.contains("brow") and not name.contains("lash"):
				material.roughness=0.18; material.metallic_specular=0.65
			elif name.contains("hair"):
				material.roughness=0.67; material.metallic_specular=0.25
			elif not name.contains("buckle") and not name.contains("silver"):
				material.roughness=maxf(material.roughness,0.64)
			mesh.set_surface_override_material(surface,material)

func _process(delta: float) -> void:
	if dead: return
	blink_clock-=delta
	if blink_clock < -0.16: blink_clock=randf_range(2.8,5.7)
	var blink := sin(clampf(-blink_clock/0.16,0,1)*PI) if blink_clock<0 else 0.0
	for mesh in face_meshes:
		for i in mesh.get_blend_shape_count():
			var name: String=mesh.mesh.get_blend_shape_name(i)
			if name.begins_with("eyeBlink"): mesh.set_blend_shape_value(i,blink*0.85)
			elif name=="jawOpen": mesh.set_blend_shape_value(i,speech_strength*0.25)
			elif name=="viseme_aa": mesh.set_blend_shape_value(i,speech_strength*(0.2+0.12*sin(speech_clock*19)))
			elif name=="viseme_O": mesh.set_blend_shape_value(i,speech_strength*maxf(0,sin(speech_clock*11))*0.22)
			elif name.begins_with("viseme_"): mesh.set_blend_shape_value(i,0)

func play(key: String, duration: float = 0, rate: float = 1, restart: bool = false) -> void:
	if not clips.has(key): key = "idle"
	if animation.current_animation != clips[key] or restart:
		animation.speed_scale=1
		animation.play(clips[key],0.08 if duration>0 else 0.2,rate)
	action_left=maxf(action_left,duration)

func animate(speed_value: float, delta: float) -> void:
	if dead: return
	action_left = maxf(0,action_left-delta)
	if action_left > 0: return
	play("run" if speed_value > 3.4 else "walk" if speed_value > 0.15 else stance)
	animation.speed_scale = clampf(speed_value/4.3,0.8,1.5) if speed_value>0.15 else 1
