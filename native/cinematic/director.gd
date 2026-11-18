extends Node
class_name MovieDirector

var game: Node3D
var active := false
var skipped := false
var epoch := 0
var camera: Camera3D
var layer: CanvasLayer
var caption: Label
var speaker: Label
var lights: Array[Node3D] = []
var fast := false

func setup(owner_game: Node3D) -> void:
	game=owner_game
	process_mode=Node.PROCESS_MODE_ALWAYS

func skip() -> void:
	skipped=true
	game.voices.stop()

func cancel(restore: bool = false) -> void:
	epoch+=1
	active=false
	game.voices.stop()
	if is_instance_valid(camera): camera.queue_free()
	if is_instance_valid(layer): layer.queue_free()
	for lamp in lights:
		if is_instance_valid(lamp): lamp.queue_free()
	lights.clear()
	if restore and is_instance_valid(game.player):
		game.player.camera.current=true
		game.world.process_mode=Node.PROCESS_MODE_INHERIT
		game.hud.visible=true
		game.mission_marker.visible=true
		game.player.avatar.visible=true
		game.playing=true
		Input.mouse_mode=Input.MOUSE_MODE_VISIBLE if game.test_mode or game.capture_mode else Input.MOUSE_MODE_CAPTURED

func play_scene(kind: String, choice: String = "") -> void:
	cancel()
	var ticket := epoch
	active=true; skipped=false
	game.playing=false
	game.world.process_mode=Node.PROCESS_MODE_DISABLED
	game.hud.visible=false
	game.mission_marker.visible=false
	Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
	camera=Camera3D.new()
	game.world.add_child(camera)
	camera.current=true
	camera.fov=38
	layer=CanvasLayer.new()
	layer.layer=5
	game.add_child(layer)
	for y in [0,865]:
		var matte := ColorRect.new()
		matte.position=Vector2(0,y)
		matte.size=Vector2(1920,80 if y==0 else 215)
		matte.color=Color(0.004,0.008,0.012,0.96)
		layer.add_child(matte)
	speaker=game.label(layer,"",18,Color(0.6,0.8,0.84))
	speaker.position=Vector2(300,892)
	caption=game.label(layer,"",27)
	caption.position=Vector2(300,927)
	caption.size=Vector2(1320,130)
	caption.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	var hint: Label=game.label(layer,"SPACE / ESC  SKIP SCENE",17,Color(0.6,0.65,0.7))
	hint.position=Vector2(1570,30)
	var hero := game.player.human as HumanAvatar
	var name: String="ENA" if game.female else "ARO"
	match kind:
		"arrival":
			await shot("mara_warning",null,"MARA / RADIO",CitadelWorld.START+Vector3(-3,3.3,2),CitadelWorld.START+Vector3(-5,0,-15),7.0,ticket)
			if ticket!=epoch: return
			await close_shot("ena_arrival" if game.female else "aro_arrival",hero,name,ticket)
		"witness":
			await close_shot("ena_question" if game.female else "aro_question",hero,name,ticket)
		"choice":
			await close_shot(("ena_" if game.female else "aro_")+choice,hero,name,ticket)
		"voss":
			var villain: HumanAvatar
			for enemy in game.enemies:
				if enemy.boss: villain=enemy.human
			if is_instance_valid(villain): await close_shot("voss_reveal",villain,"DIRECTOR VOSS",ticket)
			if ticket!=epoch: return
			await close_shot("ena_reveal" if game.female else "aro_reveal",hero,name,ticket)
		"ending":
			await close_shot("mara_ending",hero,"MARA / RADIO",ticket,false)
			if ticket!=epoch: return
			await shot("voss_echo",null,"UNKNOWN SIGNAL",game.player.position+Vector3(-4,2,2),game.player.position+Vector3(0,1,-6),5,ticket)
	if ticket==epoch: cancel(true)

func close_shot(id: String, face: HumanAvatar, name: String, ticket: int, speaks: bool = true) -> void:
	if skipped or ticket!=epoch: return
	face.action_left=0
	face.play("talk" if speaks else "idle",0,1,true)
	var forward := Vector3(0,0,1).rotated(Vector3.UP,face.global_rotation.y)
	var right := Vector3(1,0,0).rotated(Vector3.UP,face.global_rotation.y)
	var focus := face.face_position()-Vector3.UP*0.22
	var eye := focus+forward*1.8+right*0.36+Vector3.UP*0.08
	var lamp: OmniLight3D=game.world.light(game.world,focus+forward*1.4-right*0.8+Vector3.UP*0.6,Color(0.9,0.94,1),0.5,4)
	lights.append(lamp)
	await shot(id,face if speaks else null,name,eye,focus,4,ticket)
	if is_instance_valid(face): face.play("idle",0,1,true)
	if is_instance_valid(lamp): lamp.queue_free(); lights.erase(lamp)

func shot(id: String, face: HumanAvatar, name: String, eye: Vector3, focus: Vector3, fallback: float, ticket: int) -> void:
	if skipped or ticket!=epoch: return
	camera.position=eye
	camera.look_at(focus)
	var lens := CameraAttributesPractical.new()
	lens.dof_blur_far_enabled=game.quality>0
	lens.dof_blur_far_distance=eye.distance_to(focus)+0.65
	lens.dof_blur_far_transition=3
	lens.dof_blur_amount=0.18
	camera.attributes=lens
	speaker.text=name
	caption.text=game.voices.lines[id].text if game.voices.lines.has(id) else ""
	var duration: float=game.voices.play_line(id,face)
	if duration<=0: duration=fallback
	if fast: duration=0.15
	var elapsed := 0.0
	while elapsed<duration+0.22 and not skipped and ticket==epoch:
		await get_tree().process_frame
		if ticket!=epoch: return
		elapsed+=get_process_delta_time()
		camera.position=eye.lerp(eye+(focus-eye).normalized()*0.22,clampf(elapsed/duration,0,1))
		camera.look_at(focus)
