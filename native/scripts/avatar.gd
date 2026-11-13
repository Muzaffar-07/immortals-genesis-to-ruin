extends Node3D
class_name ImmortalAvatar

var animation: AnimationPlayer
var skeleton: Skeleton3D
var model: Node3D
var tint := Color.WHITE
var walk_clip := ""
var idle_clip := ""
static var scenes := {}
var moving := false
var attack_time := 0.0

func configure(female: bool, corrupted: bool = false) -> void:
	var path := "res://assets/characters/ena.glb" if female else "res://assets/characters/aro.glb"
	if ResourceLoader.exists(path):
		if not scenes.has(path): scenes[path] = load(path)
		if scenes[path] == null: return
		model = scenes[path].instantiate()
		add_child(model)
		animation = find_animation(model)
		if animation:
			for clip in animation.get_animation_list():
				if clip != "RESET":
					walk_clip = clip
					animation.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
					animation.play(clip)
					animation.advance(0.0)
					break
		# Meshy exports meter-sized skinned meshes with a centimeter skeleton.
		# Applying a second AABB fit would incorrectly enlarge the skin 100x.
		var idle_path := "res://assets/characters/ena_idle.res" if female else "res://assets/characters/aro_idle.res"
		if animation and ResourceLoader.exists(idle_path):
			var library := AnimationLibrary.new()
			library.add_animation("idle",load(idle_path))
			animation.add_animation_library("rest",library)
			idle_clip = "rest/idle"
			animation.play(idle_clip)
			animation.advance(0)
		if corrupted:
			corrupt_materials(model)
	else:
		# Only used while importing; a release test requires both generated models.
		var mesh := MeshInstance3D.new()
		var shape := CapsuleMesh.new()
		shape.radius = 0.3
		shape.height = 1.8
		mesh.mesh = shape
		mesh.position.y = 0.9
		add_child(mesh)
	var light := OmniLight3D.new()
	light.light_color = Color(0.3,0.65,1) if female else Color(1,0.55,0.2)
	light.light_energy = 0.45 if not corrupted else 0.15
	light.omni_range = 2.5
	light.position.y = 1.1
	add_child(light)

func find_animation(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer: return node
	for child in node.get_children():
		var result := find_animation(child)
		if result: return result
	return null

func mesh_bounds(node: Node3D) -> AABB:
	var result := AABB()
	var first := true
	for child in node.find_children("*", "MeshInstance3D", true, false):
		var transform_to_root: Transform3D = node.global_transform.affine_inverse() * child.global_transform
		var box: AABB = transform_to_root * child.get_aabb()
		result = box if first else result.merge(box)
		first = false
	return result

func corrupt_materials(node: Node) -> void:
	if node is MeshInstance3D:
		var material := StandardMaterial3D.new()
		material.albedo_color = Color(0.12,0.15,0.17)
		material.metallic = 0.1
		material.roughness = 0.85
		material.emission_enabled = true
		material.emission = Color(0.1,0.012,0.005)
		node.material_override = material
	for child in node.get_children(): corrupt_materials(child)

func animate(speed: float, delta: float) -> void:
	if animation and walk_clip != "":
		if speed > 0.15:
			if animation.current_animation != walk_clip: animation.play(walk_clip,0.18)
			animation.speed_scale = clampf(speed / 4.0,0.5,1.8)
		else:
			if idle_clip != "":
				if animation.current_animation != idle_clip: animation.play(idle_clip,0.25)
				animation.speed_scale = 1
			else: animation.pause()
	attack_time = maxf(0,attack_time-delta)
	if model: model.rotation.z = sin(attack_time*20)*attack_time*0.3
