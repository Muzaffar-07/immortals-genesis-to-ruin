extends NightWorld
class_name CitadelWorld

const SOURCE := "res://third_party/tps/level/geometry/"
const START := Vector3(64.8,-0.5,78.7)
var geometry: Node3D
var navigation: NavigationRegion3D
var route := [Vector3(64.8,-1,73),Vector3(71,-6,46),Vector3(53,-6,16),Vector3(-3,-11.7,20),Vector3(-9,-11.7,-17),Vector3(-16,-11.7,7)]
var beacons: Array[Node3D] = []

func build(_chapter: int) -> void:
	kind = "citadel"
	navigation = NavigationRegion3D.new()
	add_child(navigation)
	geometry = Node3D.new()
	navigation.add_child(geometry)
	for name in ["structure","props","core","lights"]:
		var scene: PackedScene = load(SOURCE+"scenes/"+name+".tscn")
		geometry.add_child(scene.instantiate())
	env = WorldEnvironment.new()
	env.environment = load(SOURCE+"environment.tres").duplicate()
	env.environment.ambient_light_color = Color(0.22,0.27,0.35)
	env.environment.ambient_light_energy = 0.6
	env.environment.tonemap_exposure = 1.9
	env.environment.glow_enabled = true
	env.environment.glow_intensity = 0.38
	env.environment.ssao_enabled = true
	env.environment.ssao_intensity = 1.2
	env.environment.volumetric_fog_density = 0.003
	add_child(env)
	var gi := VoxelGI.new()
	gi.position = Vector3(-6.09263,1.28266,2.88598)
	gi.size = Vector3(227.892,97.6096,234.056)
	gi.subdiv = VoxelGI.SUBDIV_256
	gi.data = load(SOURCE+"giprobe_data.res")
	add_child(gi)
	# Retain the authored light placement, with a bounded dynamic shadow cost.
	var shadows := 0
	for lamp in geometry.find_children("*","Light3D",true,false):
		if lamp.shadow_enabled:
			shadows += 1
			lamp.shadow_enabled = shadows <= 14
		if lamp is OmniLight3D: lamp.distance_fade_enabled = true; lamp.distance_fade_begin = 45; lamp.distance_fade_length = 20
	objective = Node3D.new()
	add_child(objective)
	objective.position = START
	portal = Node3D.new()
	add_child(portal)
	portal.position = START
	portal.visible = false
	var nav_path := "res://cinematic/citadel-navigation.res"
	if ResourceLoader.exists(nav_path): navigation.navigation_mesh = load(nav_path)
	# Art source and effects are licensed separately in licenses/GODOT-TPS-LICENSE.md.

func bake_navigation() -> void:
	var mesh := NavigationMesh.new()
	mesh.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	mesh.geometry_collision_mask = 1
	mesh.cell_size = 0.25
	mesh.cell_height = 0.25
	mesh.agent_radius = 0.4
	mesh.agent_height = 1.8
	mesh.agent_max_climb = 0.6
	mesh.agent_max_slope = 50
	navigation.navigation_mesh = mesh
	navigation.bake_navigation_mesh(false)
	ResourceSaver.save(mesh,"res://cinematic/citadel-navigation.res")
	print("Citadel navigation baked: ",mesh.get_polygon_count()," polygons")

func floor_at(pos: Vector3) -> Vector3:
	var query := PhysicsRayQueryParameters3D.create(pos+Vector3.UP*4,pos-Vector3.UP*12,1)
	var result := get_world_3d().direct_space_state.intersect_ray(query)
	return result.position+Vector3.UP*0.08 if not result.is_empty() else pos

func marker(pos: Vector3, title: String, color: Color = Color(0.1,0.75,1)) -> Node3D:
	var node := Node3D.new()
	add_child(node)
	node.position = pos
	var display := Label3D.new()
	display.text = title
	display.position.y = 2.1
	display.font_size = 38
	display.pixel_size = 0.005
	display.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	display.modulate = color
	display.no_depth_test = false
	node.add_child(display)
	light(node,Vector3(0,1,0),color,0.8,4)
	beacons.append(node)
	return node

func slash(pos: Vector3, yaw: float, combo: int, color: Color = Color(0.15,0.8,1)) -> void:
	var vertices := PackedVector3Array()
	var colors := PackedColorArray()
	var uvs := PackedVector2Array()
	for i in 28:
		var a := -1.1+i/28.0*2.4
		var b := -1.1+(i+1)/28.0*2.4
		for point in [Vector3(cos(a)*1.5,sin(a)*1.5,0),Vector3(cos(a)*2.1,sin(a)*2.1,0),Vector3(cos(b)*2.1,sin(b)*2.1,0),Vector3(cos(a)*1.5,sin(a)*1.5,0),Vector3(cos(b)*2.1,sin(b)*2.1,0),Vector3(cos(b)*1.5,sin(b)*1.5,0)]:
			vertices.append(point)
			colors.append(color)
		for uv in [Vector2(0,i/28.0),Vector2(1,i/28.0),Vector2(1,(i+1)/28.0),Vector2(0,i/28.0),Vector2(1,(i+1)/28.0),Vector2(0,(i+1)/28.0)]: uvs.append(uv)
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_COLOR] = colors
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,arrays)
	var node := MeshInstance3D.new()
	node.mesh = mesh
	var mat := ShaderMaterial.new()
	mat.shader = load("res://cinematic/arc.gdshader")
	mat.set_shader_parameter("tint",color)
	node.material_override = mat
	add_child(node)
	node.position = pos+Vector3.UP*1.1
	node.rotation = Vector3(0.4,yaw,(-0.65 if combo%2==0 else 0.65))
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(node,"scale",Vector3.ONE*1.15,0.22)
	tween.tween_method(func(value: float): mat.set_shader_parameter("fade",value),1.0,0.0,0.22)
	tween.finished.connect(node.queue_free)
	burst(pos+Vector3.UP,color,12)

func shockwave(pos: Vector3, radius: float, color: Color) -> void:
	var node := ring(pos,1,color,0.65)
	node.scale = Vector3.ONE*0.2
	create_tween().tween_property(node,"scale",Vector3(radius,0.25,radius),0.55).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	burst(pos+Vector3.UP,color,65)
	var flash := light(self,pos+Vector3.UP,color,6,radius+3)
	var fade := create_tween()
	fade.tween_property(flash,"light_energy",0,0.45)
	fade.finished.connect(flash.queue_free)
