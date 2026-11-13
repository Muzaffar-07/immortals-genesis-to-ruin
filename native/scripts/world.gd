extends Node3D
class_name NightWorld

var rng := RandomNumberGenerator.new()
var env: WorldEnvironment
var objective: Node3D
var portal: Node3D
var pickups: Array[Node3D] = []
var kind := "forest"

func material(color: Color, metal: float = 0.0, glow: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.78
	m.metallic = metal
	if glow > 0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = glow
	return m

func box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material, solid: bool = false) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var shape := BoxMesh.new()
	shape.size = size
	mesh.mesh = shape
	mesh.material_override = mat
	parent.add_child(mesh)
	mesh.position = pos
	if solid:
		var body := StaticBody3D.new()
		var col := CollisionShape3D.new()
		var collision := BoxShape3D.new()
		collision.size = size
		col.shape = collision
		body.add_child(col)
		mesh.add_child(body)
	return mesh

func light(parent: Node3D, pos: Vector3, color: Color, energy: float, radius: float) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.position = pos
	l.light_color = color
	l.light_energy = energy
	l.omni_range = radius
	parent.add_child(l)
	return l

func build(chapter: int) -> void:
	rng.seed = 8103 + chapter * 77
	kind = Campaign.MISSIONS[chapter].kind
	env = WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Campaign.MISSIONS[chapter].color * 0.24
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.36,0.45,0.58)
	e.ambient_light_energy = 0.65
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.fog_enabled = true
	e.fog_light_color = Campaign.MISSIONS[chapter].color
	e.fog_light_energy = 0.5
	e.fog_density = 0.035
	e.glow_enabled = true
	e.glow_intensity = 0.5
	e.ssao_enabled = true
	e.ssao_radius = 1.2
	e.volumetric_fog_enabled = RenderingServer.get_current_rendering_method() == "forward_plus"
	e.volumetric_fog_density = 0.015
	e.volumetric_fog_albedo = Color(0.4,0.5,0.6)
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-38,-32,0)
	sun.light_color = Color(0.55,0.69,0.85) if chapter < 2 else Color(1,0.67,0.39)
	sun.light_energy = 1.1
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 65
	add_child(sun)
	var ground := material(Color(0.62,0.65,0.67))
	ground.albedo_texture = load("res://assets/terrain/ground_color.jpg")
	ground.normal_enabled = true
	ground.normal_texture = load("res://assets/terrain/ground_normal.jpg")
	ground.roughness_texture = load("res://assets/terrain/ground_rough.jpg")
	ground.uv1_scale = Vector3(22,22,22)
	if kind == "snow": ground.albedo_color = Color(1.6,1.8,2)
	if kind == "ash": ground.albedo_color = Color(0.4,0.25,0.22)
	if kind == "void": ground.albedo_color = Color(0.27,0.22,0.42)
	box(self,Vector3(0,-0.3,0),Vector3(100,0.6,100),ground,true)
	# Collision boundaries are beyond the visible arena, hidden by fog and rock walls.
	for p in [Vector3(-46,3,0),Vector3(46,3,0),Vector3(0,3,-46),Vector3(0,3,46)]:
		var boundary := box(self,p,Vector3(2,8,94) if p.x != 0 else Vector3(94,8,2),material(Color(0.08,0.09,0.11)),true)
		boundary.visible = false
	var stone := material(Color(0.21,0.23,0.26))
	var rock_scene: PackedScene = load("res://assets/environment/boulder_01/boulder_01.gltf")
	var tree_scene: PackedScene = load("res://assets/environment/dead_tree_trunk/dead_tree_trunk.gltf")
	for i in 62:
		var angle := rng.randf_range(-PI,PI)
		var radius := rng.randf_range(15,43)
		var p := Vector3(sin(angle)*radius,0,cos(angle)*radius)
		if absf(p.x) < 4 or (p-Vector3(0,0,18)).length() < 5: continue
		var tree := i % 3 != 0 and kind in ["forest","snow","ash"]
		var prop: Node3D = (tree_scene if tree else rock_scene).instantiate()
		add_child(prop)
		prop.position = p
		prop.rotation.y = angle
		prop.scale = Vector3.ONE * rng.randf_range(1.1,2.3)
		if tree:
			# The scan is a fallen log along X; rotate it upright and ground its end.
			var length_scale := rng.randf_range(2.5,4.2)
			prop.rotation.z = PI/2
			prop.scale = Vector3(length_scale,2.1,2.1)
			prop.position.y = 1.54*length_scale-0.15
			for j in 3:
				var branch: Node3D = tree_scene.instantiate()
				add_child(branch)
				var a := angle+j*2.1
				branch.position = p+Vector3(cos(a)*1.1,3.8+j*1.2,sin(a)*1.1)
				branch.rotation = Vector3(0,-a,0.4)
				branch.scale = Vector3(0.9,0.9,0.9)
		if i % 7 == 0: light(self,p+Vector3(0,1.5,0),Color(0.12,0.42,0.62),1.2,6)
	if kind in ["ruins","base","void"]:
		for i in 12:
			var a := TAU*i/12.0
			var pos := Vector3(sin(a)*23,0,cos(a)*23)
			box(self,pos+Vector3(0,3,0),Vector3(1.7,6+rng.randf()*3,1.7),stone,true)
			box(self,pos+Vector3(0,6.1,0),Vector3(3,0.5,2.5),stone)
			if kind == "base":
				box(self,pos+Vector3(0,0.4,0),Vector3(5,0.8,3),material(Color(0.12,0.17,0.2),0.7),true)
				light(self,pos+Vector3(0,4,0),Color(1,0.12,0.07),1.5,9)
	# Central mission structure.
	objective = Node3D.new()
	add_child(objective)
	objective.position = Vector3(0,0,-5)
	box(objective,Vector3(0,0.25,0),Vector3(3,0.5,3),stone)
	if chapter == 1:
		for i in 8:
			var a := i*TAU/8
			box(objective,Vector3(sin(a),0.5,cos(a)),Vector3(0.5,0.5,0.5),stone)
	else:
		box(objective,Vector3(0,1.8,0),Vector3(0.7,3.2,0.7),material(Color(0.3,0.65,0.8),0.7,0.4))
	light(objective,Vector3(0,2.5,0),Color(0.3,0.7,1),2,8)
	portal = Node3D.new()
	add_child(portal)
	portal.position = Vector3(0,0,-33)
	for x in [-2.3,2.3]: box(portal,Vector3(x,3,0),Vector3(0.8,6,1.2),stone,true)
	box(portal,Vector3(0,6.2,0),Vector3(5.4,0.7,1.4),stone)
	box(portal,Vector3(0,3.0,0),Vector3(3.8,5.8,0.08),material(Color(0.12,0.7,0.9,1),0.4,2))
	portal.visible = false
	light(portal,Vector3(0,2,2),Color(0.1,0.8,1),4,12)
	var count: int = Campaign.MISSIONS[chapter].collect
	for i in count:
		var p := Node3D.new()
		add_child(p)
		var a := -PI/2 + TAU*i/maxi(count,1)
		p.position = Vector3(cos(a)*14,0,sin(a)*14)
		var c := Color(0.3,0.8,1) if chapter != 3 else Color(1,0.3,0.12)
		var crystal := box(p,Vector3(0,1.1,0),Vector3(0.3,0.8,0.3),material(c,0.55,2.8))
		crystal.rotation.z = 0.4
		box(p,Vector3(0,0.25,0),Vector3(1,0.5,1),stone)
		light(p,Vector3(0,1.4,0),c,2,6)
		if chapter == 3:
			box(p,Vector3(0,1.3,0),Vector3(0.65,2.6,0.65),material(Color(0.15,0.2,0.24),0.8))
		pickups.append(p)
	weather(chapter)

func weather(chapter: int) -> void:
	var particles := CPUParticles3D.new()
	particles.amount = 650
	particles.lifetime = 7
	particles.preprocess = 7
	particles.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	particles.emission_box_extents = Vector3(33,8,33)
	particles.position.y = 8
	particles.direction = Vector3(-0.2,-1,0)
	particles.spread = 15
	particles.initial_velocity_min = 0.6
	particles.initial_velocity_max = 1.5
	particles.gravity = Vector3(0,-0.2,0)
	particles.scale_amount_min = 0.015
	particles.scale_amount_max = 0.04
	particles.color = Color(0.5,0.65,0.8,0.5) if chapter < 4 else Color(1,0.3,0.1,0.6)
	var mesh := SphereMesh.new()
	mesh.radial_segments = 4
	mesh.rings = 2
	mesh.material = material(particles.color,0,0.4)
	particles.mesh = mesh
	add_child(particles)

func burst(pos: Vector3, color: Color, count: int = 18) -> void:
	var p := CPUParticles3D.new()
	p.amount = count
	p.lifetime = 0.7
	p.one_shot = true
	p.explosiveness = 1
	p.direction = Vector3.UP
	p.spread = 150
	p.initial_velocity_min = 1.5
	p.initial_velocity_max = 5
	p.gravity = Vector3(0,-9,0)
	p.scale_amount_min = 0.025
	p.scale_amount_max = 0.09
	var mesh := SphereMesh.new()
	mesh.radial_segments = 4
	mesh.rings = 2
	mesh.material = material(color,0,0.4)
	p.mesh = mesh
	add_child(p)
	p.global_position = pos
	p.emitting = true
	get_tree().create_timer(1.2).timeout.connect(p.queue_free)

func ring(pos: Vector3, radius: float, color: Color, duration: float) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = radius-0.09
	torus.outer_radius = radius+0.09
	torus.rings = 40
	torus.ring_segments = 6
	m.mesh = torus
	m.material_override = material(color,0,2)
	add_child(m)
	m.position = pos+Vector3(0,0.08,0)
	var timer := Timer.new()
	timer.one_shot = true
	timer.wait_time = duration
	m.add_child(timer)
	timer.timeout.connect(m.queue_free)
	timer.start()
	return m
