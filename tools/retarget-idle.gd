# Rebuild an idle clip for the run rig using both skins' inverse bind matrices.
# This preserves the source animation's deformation despite different bind poses.
extends SceneTree

func _initialize() -> void:
	convert.call_deferred()

func skin_binds(model: Node, skeleton: Skeleton3D) -> Dictionary:
	var result := {}
	for mesh in model.find_children("*","MeshInstance3D",true,false):
		if not mesh.skin: continue
		for i in mesh.skin.get_bind_count():
			var name: String = mesh.skin.get_bind_name(i)
			if name == "": name = skeleton.get_bone_name(mesh.skin.get_bind_bone(i))
			result[name] = mesh.skin.get_bind_pose(i)
		break
	return result

func convert() -> void:
	for character in ["ena","aro"]:
		var document := GLTFDocument.new()
		var state := GLTFState.new()
		var error := document.append_from_file("res://../tools/downloads/idle-source/%s_idle.glb" % character,state)
		if error != OK: push_error("GLB read failed"); quit(1); return
		var source := document.generate_scene(state)
		root.add_child(source)
		var target: Node = load("res://assets/characters/%s.glb" % character).instantiate()
		root.add_child(target)
		var source_skeleton: Skeleton3D = source.find_children("*","Skeleton3D",true,false)[0]
		var target_skeleton: Skeleton3D = target.find_children("*","Skeleton3D",true,false)[0]
		var source_binds := skin_binds(source,source_skeleton)
		var target_binds := skin_binds(target,target_skeleton)
		var player: AnimationPlayer = source.find_children("*","AnimationPlayer",true,false)[0]
		var name: String = player.get_animation_list()[0]
		for clip in player.get_animation_list():
			if clip != "RESET": name=clip; break
		var duration := player.get_animation(name).length
		player.play(name)
		var output := Animation.new()
		output.length = duration
		output.loop_mode = Animation.LOOP_LINEAR
		var tracks := {}
		for i in target_skeleton.get_bone_count():
			var bone: String = target_skeleton.get_bone_name(i)
			var position := output.add_track(Animation.TYPE_POSITION_3D)
			var rotation := output.add_track(Animation.TYPE_ROTATION_3D)
			output.track_set_path(position,NodePath("Armature/Skeleton3D:"+bone))
			output.track_set_path(rotation,NodePath("Armature/Skeleton3D:"+bone))
			tracks[i] = [position,rotation]
		for frame in ceili(duration*30)+1:
			var time := minf(duration,frame/30.0)
			player.seek(time,true)
			source_skeleton.force_update_all_bone_transforms()
			var poses := {}
			for i in target_skeleton.get_bone_count():
				var bone: String = target_skeleton.get_bone_name(i)
				var source_index := source_skeleton.find_bone(bone)
				if source_index >= 0 and source_binds.has(bone) and target_binds.has(bone):
					poses[i] = source_skeleton.get_bone_global_pose(source_index)*source_binds[bone]*target_binds[bone].affine_inverse()
				else: poses[i] = target_skeleton.get_bone_global_rest(i)
			for i in target_skeleton.get_bone_count():
				var parent := target_skeleton.get_bone_parent(i)
				var local: Transform3D = poses[i] if parent < 0 else poses[parent].affine_inverse()*poses[i]
				output.position_track_insert_key(tracks[i][0],time,local.origin)
				output.rotation_track_insert_key(tracks[i][1],time,local.basis.get_rotation_quaternion())
		ResourceSaver.save(output,"res://assets/characters/%s_idle.res" % character)
		print("Retargeted ",character," ",duration," seconds / ",output.get_track_count()," tracks")
		source.free()
		target.free()
	quit()
