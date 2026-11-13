extends Node3D
func _ready() -> void:
	var world := CitadelWorld.new()
	add_child(world)
	world.build(0)
	await get_tree().physics_frame
	if "--routes" in OS.get_cmdline_user_args():
		await get_tree().physics_frame
		var map := get_world_3d().navigation_map
		NavigationServer3D.map_force_update(map)
		print("NAV polygons ",world.navigation.navigation_mesh.get_polygon_count()," map ",NavigationServer3D.map_is_active(map)," regions ",NavigationServer3D.map_get_regions(map).size())
		await get_tree().create_timer(1).timeout
		var start := world.floor_at(CitadelWorld.START)
		for goal in world.route:
			var end := world.floor_at(goal)
			var path := NavigationServer3D.map_get_path(map,start,end,true)
			print("ROUTE ",start," -> ",end," points ",path.size()," end error ",path[-1].distance_to(end) if path.size()>0 else -1)
			start=end
		get_tree().quit()
		return
	if "--bake" in OS.get_cmdline_user_args():
		world.bake_navigation()
		await get_tree().physics_frame
		print("Spawn floor ",world.floor_at(CitadelWorld.START))
		for point in world.route: print("Route floor ",world.floor_at(point))
		get_tree().quit()
		return
	var camera := Camera3D.new()
	add_child(camera)
	camera.position = CitadelWorld.START+Vector3(0,2.4,0)
	camera.look_at(Vector3(65,-3,48))
	camera.current = true
	await get_tree().create_timer(5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/citadel-entry.png")
	camera.position = Vector3(45,1,24)
	camera.look_at(Vector3(0,-8,0))
	await get_tree().create_timer(3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/citadel-core.png")
	get_tree().quit()
