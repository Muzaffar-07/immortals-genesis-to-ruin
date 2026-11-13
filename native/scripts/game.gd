extends Node3D

const SAVE_PATH := "user://nightfall-save.json"
var world: NightWorld
var player: Fighter
var enemies: Array[Fighter] = []
var sound: NightSound
var chapter := 0
var female := true
var difficulty := 1.0
var gore := true
var playing := false
var paused := false
var stage := "gather"
var collected := 0
var wave := 0
var kills := 0
var elapsed := 0.0
var defend_time := 0.0
var objective_hp := 100.0
var spawn_timer := 0.0
var meteor_timer := 4.0
var hurt_flash := 0.0
var completed: Array = []
var checkpoint := 0
var ui: CanvasLayer
var overlay: Control
var hud: Control
var objective_text: Label
var progress_text: Label
var status_text: Label
var prompt_text: Label
var health_bar: ProgressBar
var stamina_bar: ProgressBar
var pulse_bar: ProgressBar
var damage_rect: ColorRect
var toast_label: Label
var toast_time := 0.0
var menu_camera: Camera3D
var menu_avatar: ImmortalAvatar
var menu_root: Node3D
var inspect_spin := 0.0
var capture_mode := false
var test_mode := false
var ambience_timer := 12.0
var save_enabled := true
var quality := 1

func _ready() -> void:
	Engine.max_fps = 60
	setup_inputs()
	sound = NightSound.new()
	add_child(sound)
	ui = CanvasLayer.new()
	add_child(ui)
	load_save()
	test_mode = "--smoke" in OS.get_cmdline_user_args()
	capture_mode = "--capture" in OS.get_cmdline_user_args()
	if test_mode or capture_mode: save_enabled = false
	show_menu()
	if test_mode: run_smoke.call_deferred()
	if capture_mode: run_capture.call_deferred()

func _exit_tree() -> void:
	ImmortalAvatar.scenes.clear()

func setup_inputs() -> void:
	var bindings := {"forward":KEY_W,"back":KEY_S,"left":KEY_A,"right":KEY_D,"sprint":KEY_SHIFT,"dodge":KEY_SPACE,"interact":KEY_E,"pulse":KEY_F,"pause":KEY_ESCAPE,"journal":KEY_M}
	for action in bindings:
		InputMap.add_action(action)
		var event := InputEventKey.new()
		event.physical_keycode = bindings[action]
		InputMap.action_add_event(action,event)
	InputMap.add_action("attack")
	var mouse := InputEventMouseButton.new()
	mouse.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("attack",mouse)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if playing: pause_game()
		elif paused: resume_game()
	if playing and event.is_action_pressed("journal"): pause_game(true)
	if playing and event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		player.yaw -= event.relative.x*0.0023
		player.pitch = clampf(player.pitch-event.relative.y*0.0023,-0.85,0.35)

func load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH): return
	var data = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if not data is Dictionary: return
	checkpoint = clampi(int(data.get("checkpoint",0)),0,5)
	completed = data.get("completed",[]) if data.get("completed",[]) is Array else []
	female = bool(data.get("female",true))
	gore = bool(data.get("gore",true))
	difficulty = clampf(float(data.get("difficulty",1.0)),0.65,1.35)

func save_game() -> void:
	if not save_enabled: return
	var file := FileAccess.open(SAVE_PATH,FileAccess.WRITE)
	if file: file.store_string(JSON.stringify({"checkpoint":checkpoint,"completed":completed,"female":female,"gore":gore,"difficulty":difficulty}))

func clear_scene() -> void:
	playing = false
	paused = false
	enemies.clear()
	for node in [world,player,menu_root]:
		if is_instance_valid(node): remove_child(node); node.queue_free()
	world = null
	player = null
	menu_root = null
	for child in ui.get_children(): ui.remove_child(child); child.queue_free()
	hud = null
	overlay = null
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func show_menu() -> void:
	clear_scene()
	world = NightWorld.new()
	add_child(world)
	world.build(0)
	menu_root = Node3D.new()
	add_child(menu_root)
	menu_avatar = ImmortalAvatar.new()
	menu_root.add_child(menu_avatar)
	menu_avatar.configure(female)
	menu_avatar.position = Vector3(3,0,9)
	menu_avatar.rotation.y = -0.35
	menu_camera = Camera3D.new()
	menu_root.add_child(menu_camera)
	menu_camera.position = Vector3(1.2,1.4,12.3)
	menu_camera.look_at(Vector3(1.8,1.0,9))
	menu_camera.fov = 52
	menu_camera.current = true
	world.light(menu_root,Vector3(3.5,2.5,11),Color(0.4,0.7,1),4,8)
	world.light(menu_root,Vector3(2,1,8),Color(1,0.3,0.08),3,6)
	overlay = full_control()
	var shade := ColorRect.new()
	shade.color = Color(0.015,0.025,0.035,0.82)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.anchor_right = 0.5
	overlay.add_child(shade)
	var stack := VBoxContainer.new()
	stack.position = Vector2(88,76)
	stack.size = Vector2(730,900)
	stack.add_theme_constant_override("separation",16)
	overlay.add_child(stack)
	label(stack,"A GAME BY MUZAFFAR ALI MOHAMMAD",18,Color(0.55,0.72,0.76))
	label(stack,"IMMORTALS",76,Color(0.94,0.91,0.82))
	label(stack,"N I G H T F A L L",28,Color(0.3,0.78,0.88))
	label(stack,"GENESIS TO RUIN",16,Color(0.65,0.68,0.68))
	spacer(stack,18)
	label(stack,"Two immortals. Six dying worlds.\nOne last chance to begin again.",25,Color(0.8,0.83,0.84))
	spacer(stack,15)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",12)
	stack.add_child(row)
	button(row,"ENA  /  FEMALE"+("  •" if female else ""),func(): female=true; save_game(); show_menu(),300)
	button(row,"ARO  /  MALE"+("  •" if not female else ""),func(): female=false; save_game(); show_menu(),300)
	label(stack,"%s · An immortal of Aurel\n%s" % ["Ena" if female else "Aro","Silver light. An unbreakable will." if female else "Born of bronze. Guardian of the first flame."],19,Color(0.65,0.75,0.8))
	button(stack,"CONTINUE  /  "+Campaign.MISSIONS[checkpoint].name,func(): show_brief(checkpoint),620)
	button(stack,"CHOOSE A CHAPTER",show_chapters,620)
	button(stack,"SETTINGS & CONTROLS",show_settings,620)
	button(stack,"QUIT",func(): get_tree().quit(),620)
	var foot := label(overlay,"PC ALPHA 0.3  •  SINGLE PLAYER  •  OPEN SOURCE\nContains horror, violence and optional blood.  |  Powered by Poly Haven",17,Color(0.5,0.58,0.62))
	foot.position = Vector2(88,980)

func full_control() -> Control:
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.add_child(root)
	return root

func label(parent: Node, text: String, size: int = 22, color: Color = Color(0.85,0.9,0.92)) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size",size)
	l.add_theme_color_override("font_color",color)
	parent.add_child(l)
	return l

func spacer(parent: Node, height: float) -> void:
	var c := Control.new()
	c.custom_minimum_size.y = height
	parent.add_child(c)

func button(parent: Node, text: String, action: Callable, width: float = 600) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(width,54)
	b.add_theme_font_size_override("font_size",20)
	for state in ["normal","hover","pressed","focus"]:
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.05,0.1,0.13,0.93) if state == "normal" else Color(0.12,0.26,0.3,0.98)
		style.border_color = Color(0.23,0.44,0.48)
		style.set_border_width_all(1)
		style.content_margin_left = 20
		b.add_theme_stylebox_override(state,style)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func modal(title: String, subtitle: String = "") -> VBoxContainer:
	if is_instance_valid(overlay): ui.remove_child(overlay); overlay.queue_free()
	overlay = full_control()
	var shade := ColorRect.new()
	shade.color = Color(0.015,0.025,0.04,0.93)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(shade)
	var stack := VBoxContainer.new()
	stack.position = Vector2(300,120)
	stack.size = Vector2(1320,850)
	stack.add_theme_constant_override("separation",22)
	overlay.add_child(stack)
	label(stack,title,52,Color(0.92,0.9,0.83))
	if subtitle != "": label(stack,subtitle,22,Color(0.44,0.73,0.79))
	return stack

func show_chapters() -> void:
	var stack := modal("SIX CHAPTERS. ONE ETERNITY.","All chapters are available. Each begins at a fresh checkpoint.")
	for i in 6:
		var n := i
		button(stack,"%02d  /  %s  —  %s%s" % [i+1,Campaign.MISSIONS[i].name,Campaign.MISSIONS[i].subtitle,"   ✓" if i in completed else ""],func(): show_brief(n))
	button(stack,"BACK",show_menu)

func show_settings() -> void:
	var stack := modal("MAKE THE NIGHT YOURS")
	button(stack,"DIFFICULTY  /  "+("STORY" if difficulty < 0.9 else "RELENTLESS" if difficulty > 1.1 else "BALANCED"),func(): difficulty=1.0 if difficulty<0.9 else 1.35 if difficulty<1.1 else 0.65; save_game(); show_settings())
	button(stack,"BLOOD EFFECTS  /  "+("ON" if gore else "OFF"),func(): gore=not gore; save_game(); show_settings())
	button(stack,"SOUND  /  "+("ON" if sound.enabled else "OFF"),func(): sound.enabled=not sound.enabled; show_settings())
	button(stack,"GRAPHICS  /  "+("FULL HD" if quality == 1 else "PERFORMANCE"),func(): quality=1-quality; apply_quality(); show_settings())
	button(stack,"TOGGLE FULLSCREEN",func(): DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if DisplayServer.window_get_mode()==DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN))
	label(stack,"WASD  Move     MOUSE  Look     SHIFT  Sprint     SPACE  Dodge\nLEFT CLICK  Energy strike     F  Communion pulse + heal     E  Interact\nESC  Pause     M  Mission journal\nAim near an enemy to lock your strike. Orange rings warn of incoming attacks.\nCheckpoint saves restart the chapter. Keyboard and mouse required.",23)
	button(stack,"BACK",show_menu)

func apply_quality() -> void:
	get_viewport().scaling_3d_scale = 1.0 if quality == 1 else 0.67
	get_viewport().msaa_3d = Viewport.MSAA_2X if quality == 1 else Viewport.MSAA_DISABLED
	if is_instance_valid(world): world.env.environment.ssao_enabled = quality == 1
	if is_instance_valid(world): world.env.environment.volumetric_fog_enabled = quality == 1 and RenderingServer.get_current_rendering_method() == "forward_plus"

func show_brief(index: int) -> void:
	chapter = index
	var m: Dictionary = Campaign.MISSIONS[chapter]
	var stack := modal("%02d  /  %s" % [chapter+1,m.name],m.place)
	label(stack,m.subtitle,32,Color(0.6,0.78,0.82))
	var brief := label(stack,m.brief,27)
	brief.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	brief.custom_minimum_size = Vector2(1100,120)
	for i in m.steps.size(): label(stack,"0%d  /  %s" % [i+1,m.steps[i]],24)
	spacer(stack,30)
	button(stack,"ENTER THE NIGHT",func(): start_mission(chapter))
	button(stack,"BACK TO CHAPTERS",show_chapters)

func start_mission(index: int) -> void:
	clear_scene()
	chapter = index
	checkpoint = index
	collected = 0
	wave = 0
	kills = 0
	elapsed = 0
	defend_time = 0
	objective_hp = 100
	spawn_timer = 0
	meteor_timer = 4
	hurt_flash = 0
	stage = "gather" if Campaign.MISSIONS[chapter].collect > 0 else "activate"
	world = NightWorld.new()
	add_child(world)
	world.build(chapter)
	player = Fighter.new()
	add_child(player)
	player.position = Vector3(0,0.1,19)
	player.setup(self,female)
	playing = true
	if chapter == 5:
		stage = "boss"
		spawn_enemy(Vector3(0,0,-14),true)
	else:
		for i in 2+chapter: spawn_enemy(Vector3(-10+i*5,0,-17))
	create_hud()
	apply_quality()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if not test_mode and not capture_mode else Input.MOUSE_MODE_VISIBLE
	save_game()
	toast(Campaign.MISSIONS[chapter].subtitle.to_upper(),5)

func create_hud() -> void:
	hud = full_control()
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var corner := VBoxContainer.new()
	corner.position = Vector2(50,40)
	corner.add_theme_constant_override("separation",7)
	hud.add_child(corner)
	label(corner,"%02d  /  %s" % [chapter+1,Campaign.MISSIONS[chapter].name],19,Color(0.46,0.73,0.78))
	objective_text = label(corner,"",28)
	progress_text = label(corner,"",20,Color(0.65,0.72,0.75))
	var bars := VBoxContainer.new()
	bars.position = Vector2(50,900)
	bars.size.x = 360
	bars.add_theme_constant_override("separation",8)
	hud.add_child(bars)
	status_text = label(bars,"",17)
	health_bar = bar(bars,Color(0.65,0.2,0.19))
	stamina_bar = bar(bars,Color(0.7,0.6,0.35))
	pulse_bar = bar(bars,Color(0.23,0.68,0.8))
	var cross := label(hud,"·",40,Color(0.7,0.9,1))
	cross.position = Vector2(954,512)
	prompt_text = label(hud,"",24,Color(0.7,0.9,1))
	prompt_text.position = Vector2(600,815)
	prompt_text.size.x = 720
	prompt_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label = label(hud,"",24,Color(0.95,0.8,0.5))
	toast_label.position = Vector2(500,185)
	toast_label.size.x = 920
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var hints := label(hud,"LMB  Strike    SPACE  Dodge    F  Pulse\nE  Interact    M  Journal    ESC  Pause",18,Color(0.57,0.65,0.69))
	hints.position = Vector2(1430,955)
	damage_rect = ColorRect.new()
	damage_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	damage_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	damage_rect.color = Color(0.65,0.02,0.01,0)
	hud.add_child(damage_rect)

func bar(parent: Node, color: Color) -> ProgressBar:
	var b := ProgressBar.new()
	b.custom_minimum_size = Vector2(350,9)
	b.show_percentage = false
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	b.add_theme_stylebox_override("fill",fill)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.04,0.08,0.1,0.8)
	b.add_theme_stylebox_override("background",bg)
	parent.add_child(b)
	return b

func _process(delta: float) -> void:
	if not playing:
		if is_instance_valid(menu_avatar):
			inspect_spin += delta
			menu_avatar.rotation.y = -0.25+sin(inspect_spin*0.25)*0.18
		return
	elapsed += delta
	hurt_flash = maxf(0,hurt_flash-delta)
	toast_time = maxf(0,toast_time-delta)
	ambience_timer -= delta
	if ambience_timer <= 0:
		ambience_timer = randf_range(12,22)
		sound.play_at("impactBell_heavy",player.position+Vector3(7,2,-10),-18,0.35)
	update_mission(delta)
	if playing: update_hud()

func update_mission(delta: float) -> void:
	if stage == "defend":
		defend_time += delta
		spawn_timer -= delta
		if chapter == 1 and spawn_timer <= 0 and enemies.size() < 9:
			spawn_timer = 9
			spawn_wave(2)
		if chapter == 1 and defend_time >= 75: open_exit()
	if stage == "waves" or (stage == "defend" and chapter == 2):
		if enemies.is_empty():
			if wave >= int(Campaign.MISSIONS[chapter].waves): open_exit()
			else:
				wave += 1
				spawn_wave(2+wave)
				if chapter == 3 and wave == 2:
					var commander := spawn_enemy(Vector3(0,0,-22),true)
					commander.max_hp = 180
					commander.hp = 180
					commander.avatar.scale = Vector3.ONE*1.6
				toast("ASSAULT %d  /  %s" % [wave,["STONE","IRON","ENGINES"][mini(wave-1,2)]],3)
	if objective_hp <= 0 and playing: fail("THE LIGHT GOES OUT","The sanctuary fell. Guard the central objective and use Communion to clear a crowd.")
	if chapter == 4:
		if elapsed >= 180: fail("THE SKY HAS FALLEN","The world ended before you escaped. Rescue all seven seeds and reach the rift.")
		meteor_timer -= delta
		if meteor_timer <= 0:
			meteor_timer = 3.0
			hazard(player.position+Vector3(randf_range(-3,3),0,randf_range(-3,3)),3.5,1.8,25)
	if chapter == 5 and stage == "boss" and enemies.is_empty(): open_exit()
	for pickup in world.pickups:
		if pickup.visible: pickup.get_child(0).rotation.y += delta

func spawn_enemy(pos: Vector3, is_boss: bool = false) -> Fighter:
	var e := Fighter.new()
	add_child(e)
	e.position = pos
	e.setup(self,false,true,is_boss)
	enemies.append(e)
	return e

func spawn_wave(count: int) -> void:
	for i in count:
		var a := randf()*TAU
		spawn_enemy(Vector3(sin(a)*24,0,cos(a)*24))

func enemy_died(enemy: Fighter) -> void:
	enemies.erase(enemy)
	kills += 1
	if gore:
		var remains := world.box(world,enemy.position+Vector3(0,0.04,0),Vector3(0.8,0.06,1.5),world.material(Color(0.15,0.015,0.02)))
		remains.rotation.y = randf()*TAU
	player.hp = minf(100,player.hp+3)

func interact() -> void:
	if not playing: return
	if stage == "gather":
		for pickup in world.pickups:
			if pickup.visible and player.position.distance_to(pickup.position)<2.6:
				pickup.visible = false
				collected += 1
				player.hp = minf(100,player.hp+12)
				sound.play_at("impactBell_heavy",pickup.position,-9,1.5)
				world.burst(pickup.position+Vector3.UP,Color(0.2,0.7,1))
				if collected >= int(Campaign.MISSIONS[chapter].collect):
					if chapter == 1: stage = "activate"
					elif chapter == 4: open_exit()
					else: stage = "waves"; wave=0; toast("THEY HEARD YOU. SURVIVE.",4)
				return
	if stage == "activate" and player.position.distance_to(world.objective.position)<3.2:
		stage = "defend"
		world.light(world.objective,Vector3(0,1,0),Color(1,0.4,0.07),4,16)
		world.burst(world.objective.position+Vector3.UP,Color(1,0.4,0.1),50)
		toast("PROTECT THE FLAME" if chapter == 1 else "THE BEACON IS LIT",4)
	if stage == "exit" and player.position.distance_to(world.portal.position)<4: win()

func open_exit() -> void:
	stage = "exit"
	world.portal.visible = true
	toast("THE WAY IS OPEN. REACH THE GATE.",5)
	sound.play_at("impactBell_heavy",player.position,-3,0.8)

func objective_line() -> String:
	match stage:
		"gather": return "Gather flint and deadwood" if chapter == 1 else "Disable the containment pylons" if chapter == 3 else "Rescue the seven living seeds" if chapter == 4 else "Recover the Maker's fragments"
		"activate": return "Ignite the hearth" if chapter == 1 else "Activate the Beacon"
		"defend": return "Keep the first flame alive" if chapter == 1 else "Defend the Beacon"
		"waves": return "Eliminate the response force" if chapter == 3 else "Survive the awakening"
		"boss": return "Defeat the Unmaking"
		"exit": return "Open the door through time" if chapter == 5 else "Reach the sanctuary gate"
	return ""

func update_hud() -> void:
	objective_text.text = objective_line()
	var info := "%d HOSTILES  •  %d FALLEN" % [enemies.size(),kills]
	if stage == "gather": info = "%d / %d RECOVERED  •  %s" % [collected,Campaign.MISSIONS[chapter].collect,info]
	if stage == "defend": info = "SANCTUARY %d%%  •  %s" % [int(objective_hp),"%ds REMAINING" % maxi(0,ceili(75-defend_time)) if chapter==1 else "ASSAULT %d / 3" % wave]
	if stage == "waves": info = "ASSAULT %d / %d  •  %s" % [wave,Campaign.MISSIONS[chapter].waves,info]
	if chapter == 4: info += "  •  COLLAPSE IN %ds" % maxi(0,ceili(180-elapsed))
	if stage == "boss" and not enemies.is_empty(): info = "FORM %d / 3  •  UNMAKING %d%%" % [enemies[0].enemy_phase,int(enemies[0].hp/enemies[0].max_hp*100)]
	progress_text.text = info
	health_bar.value = player.hp
	stamina_bar.value = player.stamina
	pulse_bar.value = player.pulse
	status_text.text = "%s   /   %d HEALTH   /   %s" % ["ENA" if female else "ARO",int(player.hp),"F · PULSE READY" if player.pulse>=100 else "PULSE %d%%" % int(player.pulse)]
	damage_rect.color.a = hurt_flash*0.22
	toast_label.text = toast_label.text if toast_time>0 else ""
	prompt_text.text = ""
	var target: Node3D
	var shortest := INF
	if stage == "gather":
		for p in world.pickups:
			var distance := player.position.distance_to(p.position)
			if p.visible and distance < shortest: target=p; shortest=distance
	elif stage == "activate": target=world.objective
	elif stage == "exit": target=world.portal
	if is_instance_valid(target):
		var distance := player.position.distance_to(target.position)
		prompt_text.text = "E  /  INTERACT" if distance < (4 if stage == "exit" else 2.6) else "NEXT OBJECTIVE  ·  %dm" % int(distance)
		# Project an objective marker into the viewport; clamp it at the edge when behind.
		var point: Vector2 = player.camera.unproject_position(target.position+Vector3(0,2.5,0))
		if player.camera.is_position_behind(target.position): point=Vector2(960,130)
		prompt_text.position = Vector2(clampf(point.x-360,40,1160),clampf(point.y,180,815))

func toast(message: String, duration: float = 3) -> void:
	toast_time = duration
	if is_instance_valid(toast_label): toast_label.text = message

func hazard(pos: Vector3, radius: float, delay: float, damage: float) -> void:
	var active_world := world
	world.ring(pos,radius,Color(1,0.19,0.06),delay)
	# Pause-aware countdown is owned by the mission; clearing a chapter cancels it.
	var timer := Timer.new()
	timer.one_shot = true
	timer.wait_time = delay
	active_world.add_child(timer)
	timer.timeout.connect(func():
		if not is_instance_valid(active_world) or world != active_world: return
		world.burst(pos+Vector3.UP,Color(1,0.28,0.04),70)
		sound.play_at("impactMetal_heavy",pos,0,0.4)
		if is_instance_valid(player) and player.position.distance_to(pos) < radius: player.damage(damage)
		timer.queue_free())
	timer.start()

func beam(start: Vector3, end: Vector3) -> void:
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.025
	mesh.bottom_radius = 0.045
	mesh.height = start.distance_to(end)
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.material_override = world.material(Color(0.25,0.8,1),0,4)
	world.add_child(node)
	node.position = (start+end)/2
	node.quaternion = Quaternion(Vector3.UP,(end-start).normalized())
	get_tree().create_timer(0.09).timeout.connect(node.queue_free)

func pause_game(journal: bool = false) -> void:
	playing = false
	paused = true
	world.process_mode = Node.PROCESS_MODE_DISABLED
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var stack := modal("MISSION JOURNAL" if journal else "THE NIGHT CAN WAIT",Campaign.MISSIONS[chapter].name)
	label(stack,objective_line(),30)
	var brief := label(stack,Campaign.MISSIONS[chapter].brief,25)
	brief.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	brief.custom_minimum_size = Vector2(1100,120)
	for step in Campaign.MISSIONS[chapter].steps: label(stack,"•  "+step,23)
	label(stack,"Dodge orange attack rings. Keep moving. Communion heals you and hits nearby enemies.\nAim near enemies to direct your energy strike. Recoveries also restore health.",22,Color(0.55,0.72,0.75))
	button(stack,"RESUME",resume_game)
	button(stack,"RESTART CHAPTER",func(): start_mission(chapter))
	button(stack,"RETURN TO TITLE",show_menu)

func resume_game() -> void:
	if is_instance_valid(overlay): ui.remove_child(overlay); overlay.queue_free()
	overlay = null
	playing = true
	paused = false
	world.process_mode = Node.PROCESS_MODE_INHERIT
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if not test_mode else Input.MOUSE_MODE_VISIBLE

func fail(title: String, reason: String) -> void:
	playing = false
	world.process_mode = Node.PROCESS_MODE_DISABLED
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var stack := modal(title,reason)
	spacer(stack,90)
	button(stack,"RETURN TO THIS MOMENT",func(): start_mission(chapter))
	button(stack,"RETURN TO TITLE",show_menu)

func win() -> void:
	playing = false
	world.process_mode = Node.PROCESS_MODE_DISABLED
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	if not chapter in completed: completed.append(chapter)
	checkpoint = mini(5,chapter+1)
	save_game()
	var stack := modal("THE FIRST MORNING" if chapter == 5 else "A MOMENT SURVIVED","CHAPTER %02d COMPLETE  /  %d FALLEN  /  %02d:%02d" % [chapter+1,kills,int(elapsed)/60,int(elapsed)%60])
	var story := "The door opens onto a forest that has never seen a sunrise. This time, you remember.\nEna reaches for Aro. Somewhere between the trees, the first bird begins to sing." if chapter == 5 else "The light holds. For a little while, the dark has no name.\nBeyond the gate, another age is waiting."
	label(stack,story,26)
	spacer(stack,100)
	button(stack,"BEGIN AGAIN" if chapter == 5 else "THE NEXT CHAPTER",func(): show_brief(0 if chapter==5 else chapter+1))
	button(stack,"RETURN TO TITLE",show_menu)

func run_smoke() -> void:
	var errors: Array[String] = []
	for path in ["res://assets/characters/ena.glb","res://assets/characters/aro.glb"]:
		if not ResourceLoader.exists(path): errors.append("Missing character: "+path)
	for sex in [false,true]:
		female = sex
		for index in 6:
			start_mission(index)
			await get_tree().process_frame
			if not player.avatar.animation: errors.append("No animation on character")
			if stage == "gather":
				for pickup in world.pickups:
					player.position = pickup.position
					interact()
			if stage == "activate":
				player.position = world.objective.position
				interact()
			if index == 1:
				defend_time = 74.9
				update_mission(0.2)
			for loop in 5:
				for e in enemies.duplicate(): e.damage(10000)
				update_mission(0.1)
			if stage != "exit": errors.append("No exit chapter %d" % index)
			player.position = world.portal.position
			interact()
			if playing or not index in completed: errors.append("Win failed chapter %d" % index)
			print("PASS chapter ",index+1," character ","Ena" if female else "Aro")
	start_mission(0)
	player.damage(1000)
	if playing: errors.append("Death did not fail")
	start_mission(2)
	objective_hp = 0
	update_mission(0)
	if playing: errors.append("Objective loss did not fail")
	start_mission(4)
	elapsed = 180
	update_mission(0)
	if playing: errors.append("Collapse did not fail")
	start_mission(0)
	pause_game()
	if playing or not paused: errors.append("Pause failed")
	resume_game()
	if not playing or paused: errors.append("Resume failed")
	# Exercise controls through the same InputMap and physics path as normal play.
	for enemy in enemies.duplicate(): enemy.damage(10000)
	await get_tree().physics_frame
	var initial_position := player.position
	Input.action_press("forward")
	for tick in 20: await get_tree().physics_frame
	Input.action_release("forward")
	if player.position.z >= initial_position.z-0.5: errors.append("Forward movement failed")
	var victim := spawn_enemy(player.position+Vector3(0,0,-6))
	var victim_hp := victim.hp
	Input.action_press("attack")
	for tick in 3: await get_tree().physics_frame
	Input.action_release("attack")
	if victim.hp >= victim_hp: errors.append("Aimed strike failed")
	Input.action_press("dodge")
	for tick in 2: await get_tree().physics_frame
	Input.action_release("dodge")
	var protected_hp := player.hp
	player.damage(20)
	if player.invulnerable <= 0 or player.hp != protected_hp: errors.append("Dodge protection failed")
	player.hp = 70
	player.pulse = 100
	Input.action_press("pulse")
	for tick in 2: await get_tree().physics_frame
	Input.action_release("pulse")
	if player.hp < 90 or player.pulse >= 100: errors.append("Communion healing failed")
	if errors.is_empty(): print("NATIVE SMOKE PASSED: 12 chapter paths, failure paths, pause/resume, movement, aiming, dodge, pulse")
	else:
		for error in errors: push_error(error)
	clear_scene()
	ImmortalAvatar.scenes.clear()
	await get_tree().process_frame
	await get_tree().process_frame
	get_tree().quit(0 if errors.is_empty() else 1)

func run_capture() -> void:
	DirAccess.make_dir_recursive_absolute("res://test-output")
	await get_tree().create_timer(3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/title.png")
	female = false
	show_menu()
	await get_tree().create_timer(2).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/aro.png")
	female = true
	start_mission(0)
	player.yaw = 0
	player.pitch = -0.12
	await get_tree().create_timer(3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/forest.png")
	print("Forest FPS: ",Engine.get_frames_per_second())
	Input.action_press("forward")
	await get_tree().create_timer(1).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/running.png")
	Input.action_release("forward")
	start_mission(3)
	await get_tree().create_timer(2).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/earthfall.png")
	start_mission(5)
	player.position = Vector3(0,0,1)
	await get_tree().create_timer(2).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/unmaking.png")
	get_tree().quit()
