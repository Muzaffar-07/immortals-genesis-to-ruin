extends "res://scripts/game.gd"

const TITLES := ["AFTERIMAGE","CUT THE LIGHTS","THE WITNESS","CLEAN SWEEP","THE KING'S LIE","THE GLASS CHOIR","DAYBREAK"]
const GOALS := ["Inspect the abandoned recorder","Disable the security junction","Find Dr. Mara Vale","Survive the containment squad","Access the research archive","Confront Director Voss","Reach the extraction signal"]
const STORY_SAVE := "user://glass-choir.json"
var phase := 0
var slow_time := 0.0
var mission_marker: Node3D
var marker_label: Label
var subtitle: Label
var subtitle_left := 0.0
var power_text: Label
var boss_text: Label
var combo_text: Label
var streak := 0
var streak_time := 0.0
var trust_mara := true
var broadcast := true
var journal: Array[String] = []
var cast_nodes: Array[Node3D] = []
var music: AudioStreamPlayer
var dialog_active := false
var checkpoint_phase := 0
var checkpoint_exists := false
var arena_triggered := false
var target_point := Vector3.ZERO
var lift_pending := false
var lift_point := Vector3.ZERO
var travel_overlay: ColorRect
var dialogue_camera: Camera3D
var dialogue_actor: HumanAvatar

func _ready() -> void:
	Engine.max_fps = 60
	setup_inputs()
	for pair in [["blink",KEY_Q],["gravity",KEY_R],["jump",KEY_C],["lock",KEY_TAB]]:
		InputMap.add_action(pair[0])
		var key := InputEventKey.new()
		key.physical_keycode = pair[1]
		InputMap.action_add_event(pair[0],key)
	InputMap.add_action("block")
	var mouse := InputEventMouseButton.new()
	mouse.button_index = MOUSE_BUTTON_RIGHT
	InputMap.action_add_event("block",mouse)
	sound = NightSound.new()
	add_child(sound)
	ui = CanvasLayer.new()
	add_child(ui)
	test_mode = "--cinematic-test" in OS.get_cmdline_user_args()
	capture_mode = "--cinematic-capture" in OS.get_cmdline_user_args()
	save_enabled = not test_mode and not capture_mode
	load_story()
	show_menu()
	if test_mode: run_cinematic_test.call_deferred()
	if capture_mode: capture_cinematic.call_deferred()

func clear_scene() -> void:
	for actor in cast_nodes:
		if is_instance_valid(actor): actor.queue_free()
	cast_nodes.clear()
	if is_instance_valid(music): music.queue_free()
	dialog_active = false
	mission_marker = null
	dialogue_camera=null
	dialogue_actor=null
	menu_avatar = null
	super.clear_scene()

func show_menu() -> void:
	clear_scene()
	world = CitadelWorld.new()
	add_child(world)
	world.build(0)
	menu_root = Node3D.new()
	add_child(menu_root)
	var hero := HumanAvatar.new()
	menu_root.add_child(hero)
	hero.configure_cast("ena" if female else "aro")
	hero.position = CitadelWorld.START+Vector3(0,-0.6,0)
	hero.rotation.y = 0.2
	menu_avatar = hero
	menu_camera = Camera3D.new()
	menu_root.add_child(menu_camera)
	menu_camera.position = hero.position+Vector3(-1.6,1.6,3.1)
	menu_camera.look_at(hero.position+Vector3(-0.85,1.05,0))
	menu_camera.fov = 48
	menu_camera.current = true
	world.light(menu_root,hero.position+Vector3(1,2,2),Color(0.65,0.8,1),0.85,6)
	world.light(menu_root,hero.position+Vector3(-2,2,-1),Color(1,0.36,0.16),1.0,5)
	overlay = full_control()
	var shade := ColorRect.new()
	shade.color = Color(0.01,0.02,0.03,0.87)
	shade.size = Vector2(880,1080)
	overlay.add_child(shade)
	var stack := VBoxContainer.new()
	stack.position = Vector2(80,86)
	stack.size = Vector2(730,900)
	stack.add_theme_constant_override("separation",18)
	overlay.add_child(stack)
	label(stack,"MUZAFFAR ALI MOHAMMAD PRESENTS",18,Color(0.42,0.7,0.77))
	label(stack,"IMMORTALS",72)
	label(stack,"THE GLASS CHOIR",32,Color(0.4,0.8,0.9))
	spacer(stack,20)
	label(stack,"They learned how to live forever.\nThen they learned what it costs.",26)
	label(stack,"EARTHFALL  /  BLACKWATER FACILITY  /  03:17 AM",16,Color(0.65,0.7,0.75))
	spacer(stack,20)
	var row := HBoxContainer.new()
	stack.add_child(row)
	button(row,"ENA"+("  •" if female else ""),func(): female=true; show_menu(),300)
	button(row,"ARO"+("  •" if not female else ""),func(): female=false; show_menu(),300)
	button(stack,"ENTER BLACKWATER",func(): checkpoint_phase=0; start_mission(0))
	if checkpoint_exists: button(stack,"CONTINUE  /  "+TITLES[checkpoint_phase],func(): start_mission(checkpoint_phase))
	button(stack,"GRAPHICS & CONTROLS",show_settings)
	button(stack,"CREDITS",show_credits)
	button(stack,"EXIT",func(): get_tree().quit())
	label(stack,"PLAYABLE DEVELOPMENT BUILD  •  Keyboard + mouse",16,Color(0.5,0.57,0.6))
	apply_quality()

func start_mission(index: int) -> void:
	clear_scene()
	if index==0:
		journal.clear()
		trust_mara=true; broadcast=true
	phase = clampi(index,0,6)
	chapter = 0
	stage = "cinematic"
	slow_time=0; streak=0; kills=0; elapsed=0; arena_triggered=false
	world = CitadelWorld.new()
	add_child(world)
	world.build(0)
	await get_tree().physics_frame
	player = Combatant.new()
	add_child(player)
	(player as Combatant).setup_cast(self,"ena" if female else "aro")
	player.position = world.floor_at(CitadelWorld.START if phase==0 else world.route[maxi(0,phase-1)])+Vector3.UP*0.12
	player.avatar.rotation.y=PI
	playing = true
	create_hud()
	set_phase(phase)
	apply_quality()
	music = AudioStreamPlayer.new()
	add_child(music)
	music.stream = load("res://third_party/tps/level/level_music.ogg")
	music.volume_db = -23
	music.play()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if test_mode or capture_mode else Input.MOUSE_MODE_CAPTURED
	say("MARA VALE", "If you can hear this, don't trust the voice on the intercom. It sounds like a man. It isn't.",8)

func create_hud() -> void:
	hud = full_control()
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var corner := VBoxContainer.new()
	corner.position = Vector2(48,38)
	corner.add_theme_constant_override("separation",8)
	hud.add_child(corner)
	label(corner,"BLACKWATER  /  EARTHFALL",17,Color(0.4,0.75,0.82))
	objective_text = label(corner,"",27)
	progress_text = label(corner,"",18,Color(0.65,0.72,0.76))
	var bars := VBoxContainer.new()
	bars.position = Vector2(48,900)
	hud.add_child(bars)
	status_text = label(bars,"VITALITY / STAMINA / RESONANCE",14)
	health_bar = bar(bars,Color(0.75,0.25,0.2))
	stamina_bar = bar(bars,Color(0.8,0.65,0.3))
	pulse_bar = bar(bars,Color(0.2,0.7,0.95))
	power_text = label(hud,"",18)
	power_text.position = Vector2(1200,930)
	label(hud,"",20)
	prompt_text = label(hud,"",24,Color(0.6,0.9,1))
	prompt_text.position = Vector2(540,790)
	prompt_text.size.x = 840
	prompt_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label = label(hud,"",27,Color(1,0.8,0.4))
	toast_label.position = Vector2(540,150)
	toast_label.size.x = 840
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle = label(hud,"",23,Color(0.92,0.94,0.96))
	subtitle.position = Vector2(490,845)
	subtitle.size = Vector2(940,85)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	marker_label = label(hud,"",21,Color(0.3,0.85,1))
	boss_text = label(hud,"",24,Color(1,0.35,0.25))
	boss_text.position = Vector2(650,65)
	combo_text = label(hud,"",28,Color(1,0.8,0.3))
	combo_text.position = Vector2(1550,430)
	damage_rect = ColorRect.new()
	damage_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	damage_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	damage_rect.color = Color(0.7,0,0,0)
	hud.add_child(damage_rect)

func set_phase(value: int) -> void:
	phase = value
	arena_triggered=false
	if is_instance_valid(mission_marker): mission_marker.queue_free()
	target_point = world.floor_at(world.route[mini(phase,5)])
	if phase==6: target_point = world.floor_at(Vector3(-16,-11.7,7))
	mission_marker = world.marker(target_point,"◆  "+TITLES[phase])
	if phase in [0,1,4]:
		world.box(world,target_point+Vector3(0,0.65,0),Vector3(0.65,1.3,0.5),world.material(Color(0.035,0.07,0.09),0.7))
		world.box(world,target_point+Vector3(0,1.1,0.26),Vector3(0.48,0.28,0.02),world.material(Color(0.08,0.65,0.75),0,1.8))
	# Freight lifts connect the three authored decks. They are deliberate mission
	# transitions; AI navigation stays on the walkable mesh of its own deck.
	lift_pending=phase in [1,3]
	if lift_pending:
		lift_point=world.floor_at(world.route[phase-1])
		mission_marker.position=lift_point
		(mission_marker.get_child(0) as Label3D).text="FREIGHT LIFT / E"
		world.box(world,lift_point+Vector3(0,0.55,-0.8),Vector3(0.7,1.1,0.35),world.material(Color(0.05,0.1,0.14),0.7))
	checkpoint_phase = phase
	save_story()
	toast(TITLES[phase],3)
	if phase in [1,3,5]:
		for i in ((4 if trust_mara else 6) if phase==3 else 2 if phase==1 else 0): spawn_guard(target_point+Vector3((i%2)*4-2,0,(i/2)*4+3))
	if phase==2:
		var mara := HumanAvatar.new()
		world.add_child(mara)
		mara.configure_cast("mara")
		mara.position=target_point
		cast_nodes.append(mara)
	if phase==5:
		var voss := spawn_guard(target_point+Vector3(0,0,-3),true)
		voss.max_hp = 550 if not broadcast else 750
		voss.hp = voss.max_hp
		say("DIRECTOR VOSS","You think you are the original? I remember your first sunrise too.",7)
	if phase==6: say("MARA VALE","The doors are open. Get out before the next copy wakes up.",6)

func spawn_guard(pos: Vector3, leader: bool = false) -> Combatant:
	var actor := Combatant.new()
	world.add_child(actor)
	actor.position = world.floor_at(pos)+Vector3.UP*0.15
	actor.setup_cast(self,"voss" if leader else "guard",true,leader)
	enemies.append(actor)
	return actor

func _process(delta: float) -> void:
	if not playing:
		if is_instance_valid(menu_avatar): menu_avatar.animate(0,delta)
		return
	elapsed += delta
	slow_time=maxf(0,slow_time-delta)
	streak_time=maxf(0,streak_time-delta)
	if streak_time==0: streak=0
	hurt_flash=maxf(0,hurt_flash-delta)
	toast_time=maxf(0,toast_time-delta)
	subtitle_left=maxf(0,subtitle_left-delta)
	if phase==3 and not lift_pending and enemies.is_empty():
		say("MARA VALE","That squad had my clearance code. Voss knew I would help you.",6)
		set_phase(4)
	if phase==5 and enemies.is_empty():
		journal.append("Voss was a copy. The archive contains thousands more.")
		set_phase(6)
	update_hud()

func update_hud() -> void:
	objective_text.text = "%02d  /  %s" % [phase+1,TITLES[phase]]
	progress_text.text = GOALS[phase]+"  •  %d hostiles" % enemies.size()
	health_bar.value = player.hp/player.max_hp*100
	stamina_bar.value=player.stamina
	pulse_bar.value=player.pulse
	toast_label.visible=toast_time>0
	subtitle.visible=subtitle_left>0
	damage_rect.color.a=hurt_flash*0.45
	var hero := player as Combatant
	power_text.text="Q  BLINK %s    R  GRAVITY %s\nF  TIME FRACTURE %s\nLMB Combo   RMB Parry   SPACE Evade   TAB Lock" % ["READY" if hero.blink_cd<=0 else "%.1fs" % hero.blink_cd,"READY" if hero.gravity_cd<=0 else "%.1fs" % hero.gravity_cd,"ACTIVE" if slow_time>0 else "READY" if hero.pulse>=100 else "%d%%" % hero.pulse]
	combo_text.text = "%d HITS\n%s" % [streak,"RELENTLESS" if streak>=8 else "RESONANCE"] if streak>1 else ""
	boss_text.text=""
	for enemy in enemies:
		if enemy.boss: boss_text.text="DIRECTOR VOSS   /   ECHO %d   /   %d%%" % [enemy.enemy_phase,int(enemy.hp/enemy.max_hp*100)]
	var objective_position := lift_point if lift_pending else target_point
	var distance := player.position.distance_to(objective_position)
	prompt_text.text = "E  "+GOALS[phase] if distance<3.3 and enemies.is_empty() else "Eliminate the guards to access this area" if distance<3.3 else ""
	if phase==3: prompt_text.text=""
	if lift_pending:
		progress_text.text="Take the freight lift to "+("Security" if phase==1 else "Containment")
		prompt_text.text="E  Descend in the freight lift" if distance<3.3 else ""
	var marker_pos := objective_position+Vector3.UP*2.2
	marker_label.text="◆  %dm" % int(distance)
	if not player.camera.is_position_behind(marker_pos):
		var screen := player.camera.unproject_position(marker_pos)
		marker_label.position = Vector2(clampf(screen.x-25,40,1800),clampf(screen.y+32,220,730))
	else: marker_label.position=Vector2(900,720); marker_label.text="↶  OBJECTIVE BEHIND YOU  %dm" % int(distance)

func interact() -> void:
	if playing and lift_pending and player.position.distance_to(lift_point)<3.3:
		use_lift()
		return
	if not playing or player.position.distance_to(target_point)>3.3 or not enemies.is_empty(): return
	match phase:
		0:
			journal.append("Recorder: the screams repeat every 41 seconds. The victims are being reconstructed.")
			dialogue("AFTERIMAGE / RECORDER", "MARA: I watched patient 09 die three times. Each time he remembered the last.\n\nThe last voice on the tape is yours. You have never been here.",["Follow the signal"],[func(): set_phase(1)])
		1:
			journal.append("Security junction: every guard has the same date of birth.")
			world.shockwave(target_point,5,Color(0.2,0.6,1))
			say("DIRECTOR VOSS","Security is a kindness. Outside these walls, your species is already extinct.",6)
			set_phase(2)
		2:
			dialogue("DR. MARA VALE", "I built the first resurrection chamber. Voss made me keep the memories.\nI can shut down his reinforcements, but you have to let me stay at the console.",["Trust her. Save whoever is left.","No more experiments. Come with me."],[func(): trust_mara=true; witness_done(),func(): trust_mara=false; witness_done()])
		4:
			dialogue("ARCHIVE / THE KING'S LIE", "Voss is not extending life. He is replacing people with copies that obey him.\nBroadcasting exposes Blackwater, but keeps his backup reactor online.\nDestroying the archive weakens him and erases the proof.",["Broadcast the evidence.","Destroy the archive. End the copies."],[func(): broadcast=true; archive_done(),func(): broadcast=false; archive_done()])
		6: win()

func use_lift() -> void:
	playing=false
	world.process_mode=Node.PROCESS_MODE_DISABLED
	travel_overlay=ColorRect.new()
	travel_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	travel_overlay.color=Color(0.008,0.015,0.025,0)
	ui.add_child(travel_overlay)
	var caption := label(travel_overlay,"DESCENDING / "+("SECURITY DECK" if phase==1 else "CONTAINMENT DECK"),26)
	caption.position=Vector2(640,510)
	sound.play_at("impactMetal_heavy",player.position,-3,0.5)
	await create_tween().tween_property(travel_overlay,"color:a",1,0.55).finished
	var destination: Vector3 = target_point+Vector3(0,0,6)
	player.position=world.floor_at(destination)+Vector3.UP*0.2
	player.velocity=Vector3.ZERO
	player.yaw=0
	player.avatar.rotation.y=PI
	lift_pending=false
	mission_marker.position=target_point
	(mission_marker.get_child(0) as Label3D).text="◆  "+TITLES[phase]
	await get_tree().create_timer(0.7).timeout
	await create_tween().tween_property(travel_overlay,"color:a",0,0.45).finished
	travel_overlay.queue_free()
	world.process_mode=Node.PROCESS_MODE_INHERIT
	playing=true

func witness_done() -> void:
	journal.append("Mara remained at the console." if trust_mara else "Mara escaped with the survivors.")
	set_phase(3)
	say("VOSS","Containment protocol. Leave no witnesses.",5)

func archive_done() -> void:
	journal.append("The evidence was broadcast." if broadcast else "The archive was destroyed.")
	set_phase(5)

func dialogue(who: String, text: String, choices: Array, actions: Array) -> void:
	playing=false; dialog_active=true
	hud.visible=false
	mission_marker.visible=false
	player.avatar.visible=false
	world.process_mode=Node.PROCESS_MODE_DISABLED
	Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
	if is_instance_valid(overlay): overlay.queue_free()
	overlay=full_control()
	var shade := ColorRect.new()
	shade.position=Vector2(0,590)
	shade.size=Vector2(1920,490)
	shade.color=Color(0.008,0.018,0.025,0.94)
	overlay.add_child(shade)
	var stack := VBoxContainer.new()
	stack.position=Vector2(160,620)
	stack.size=Vector2(1600,430)
	stack.add_theme_constant_override("separation",12)
	overlay.add_child(stack)
	label(stack,who,32,Color(0.4,0.8,0.9))
	var body := label(stack,text,24)
	body.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	body.custom_minimum_size=Vector2(1550,125)
	if phase==2 and not cast_nodes.is_empty():
		dialogue_actor=cast_nodes[-1] as HumanAvatar
		dialogue_actor.animation.process_mode=Node.PROCESS_MODE_ALWAYS
		dialogue_actor.play("talk",20)
		dialogue_actor.rotation.y=0.25
		dialogue_camera=Camera3D.new()
		world.add_child(dialogue_camera)
		dialogue_camera.position=dialogue_actor.global_position+Vector3(0.7,1.6,2.3)
		dialogue_camera.look_at(dialogue_actor.global_position+Vector3(0,1.3,0))
		dialogue_camera.fov=45
		dialogue_camera.current=true
		world.light(dialogue_actor,Vector3(0,1.8,1),Color(0.7,0.85,1),0.8,3)
	for i in choices.size():
		var action: Callable=actions[i]
		button(stack,choices[i],func(): dialog_active=false; resume_game(); action.call(),1500)

func resume_game() -> void:
	if is_instance_valid(hud): hud.visible=true
	if is_instance_valid(mission_marker): mission_marker.visible=true
	player.avatar.visible=true
	if is_instance_valid(dialogue_camera): dialogue_camera.queue_free()
	if is_instance_valid(dialogue_actor):
		dialogue_actor.animation.process_mode=Node.PROCESS_MODE_INHERIT
		dialogue_actor.play("idle")
	dialogue_camera=null; dialogue_actor=null
	player.camera.current=true
	super.resume_game()

func say(who: String, text: String, duration: float = 6) -> void:
	subtitle.text=who.to_upper()+"\n"+text
	subtitle_left=duration

func register_hit(_combo: int) -> void:
	streak += 1
	streak_time=3

func enemy_died(enemy: Fighter) -> void:
	enemies.erase(enemy)
	kills += 1
	player.hp=minf(player.max_hp,player.hp+7)
	sound.play_at("impactPunch_heavy",enemy.position,-8,0.75)

func pause_game(_journal: bool = false) -> void:
	playing=false; paused=true
	world.process_mode=Node.PROCESS_MODE_DISABLED
	Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
	var stack := modal("THE GLASS CHOIR",GOALS[phase])
	label(stack,"EVIDENCE\n"+"\n".join(journal) if not journal.is_empty() else "Find the recorder to begin the investigation.",24)
	button(stack,"RESUME",resume_game)
	button(stack,"RESTART CHECKPOINT",func(): start_mission(checkpoint_phase))
	button(stack,"RETURN TO TITLE",show_menu)

func _unhandled_input(event: InputEvent) -> void:
	if dialog_active: return
	super._unhandled_input(event)

func fail(title: String, reason: String) -> void:
	playing=false
	world.process_mode=Node.PROCESS_MODE_DISABLED
	Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
	var stack := modal(title,reason)
	button(stack,"RETRY CHECKPOINT",func(): start_mission(checkpoint_phase))
	button(stack,"RETURN TO TITLE",show_menu)

func win() -> void:
	playing=false
	world.process_mode=Node.PROCESS_MODE_DISABLED
	Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
	var stack := modal("DAYBREAK / "+("THE WORLD REMEMBERS" if broadcast else "A MERCIFUL SILENCE"),"BLACKWATER COMPLETE  /  %d ENEMIES DEFEATED" % kills)
	var ending := "The transmission reaches every city. Voss's face fills a thousand screens. For the first time, the world knows what immortality costs." if broadcast else "The archive burns. The remaining copies fall silent. The world is safe from Blackwater, but the names of its victims vanish with it."
	ending += "\n\n"+("Mara stays behind long enough to free the final prisoners. At dawn, her signal returns." if trust_mara else "Mara leaves with you. She knows the truth, even if no one else ever will.")
	ending += "\n\nThen a voice answers on your own frequency: 'I remember your first sunrise too.'"
	var body := label(stack,ending,27)
	body.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	body.custom_minimum_size=Vector2(1200,330)
	button(stack,"PLAY THE OTHER CHOICE",func(): start_mission(4))
	button(stack,"RETURN TO TITLE",show_menu)

func show_settings() -> void:
	var stack := modal("GRAPHICS & CONTROLS")
	button(stack,"QUALITY / "+["PERFORMANCE","FULL HD","4K SUPERSAMPLING"][quality],func(): quality=(quality+1)%3; apply_quality(); show_settings())
	button(stack,"BLOOD EFFECTS / "+("ON" if gore else "OFF"),func(): gore=not gore; show_settings())
	button(stack,"FULLSCREEN",func(): DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN))
	label(stack,"WASD Move  •  MOUSE Look  •  SHIFT Sprint  •  C Jump\nLMB Combo  •  RMB Block / tap as a strike lands to parry\nSPACE Evade  •  TAB Lock target  •  Q Blink strike\nR Gravity pull  •  F Time fracture  •  E Interact\nM Evidence journal  •  ESC Pause\n\n4K renders at 3840 × 2160 internally. Use Full HD for this PC's GPU.",24)
	button(stack,"BACK",show_menu)

func apply_quality() -> void:
	get_viewport().scaling_3d_scale=[0.67,1.0,2.0][quality]
	get_viewport().msaa_3d=Viewport.MSAA_2X if quality>0 else Viewport.MSAA_DISABLED
	if is_instance_valid(world):
		world.env.environment.ssao_enabled=quality>0
		world.env.environment.volumetric_fog_enabled=quality>0 and RenderingServer.get_current_rendering_method()=="forward_plus"

func show_credits() -> void:
	var stack := modal("BUILT IN THE OPEN")
	label(stack,"Concept & world: Muzaffar Ali Mohammad\nGodot Engine / MIT\nIndustrial environment: Godot TPS Demo\nJuan Linietsky & Fernando Miguel Calabró / CC BY 3.0\nMusic: Christian Fernando Perucchi / CC BY 3.0\nHuman characters: Ara 3D Gen + MakeHuman / CC0 assets\nSound effects: Kenney / CC0\nFull notices and reproducible character parameters ship with the source.",25)
	button(stack,"BACK",show_menu)

func save_story() -> void:
	if not save_enabled: return
	checkpoint_exists=true
	var file := FileAccess.open(STORY_SAVE,FileAccess.WRITE)
	file.store_string(JSON.stringify({"phase":checkpoint_phase,"female":female,"trust":trust_mara,"broadcast":broadcast,"journal":journal}))

func load_story() -> void:
	if not FileAccess.file_exists(STORY_SAVE): return
	var data = JSON.parse_string(FileAccess.get_file_as_string(STORY_SAVE))
	if not data is Dictionary: return
	checkpoint_phase=clampi(int(data.get("phase",0)),0,6)
	female=bool(data.get("female",true))
	trust_mara=bool(data.get("trust",true))
	broadcast=bool(data.get("broadcast",true))
	journal.assign(data.get("journal",[]))
	checkpoint_exists=true

func run_cinematic_test() -> void:
	var errors: Array[String]=[]
	for heroine in [true,false]:
		female=heroine
		await start_mission(0)
		await get_tree().create_timer(0.5).timeout
		var hero := player as Combatant
		for clip in ["idle","run","combo","kick","roundhouse","block","hit"]:
			if not hero.human.clips.has(clip): errors.append("Missing hero animation "+clip)
		print("CAST ",hero.role," clips ",hero.human.clips.keys())
		# Mission interactions use the same UI signals as real play.
		player.position=target_point
		interact()
		if not dialog_active: errors.append("Recorder did not open")
		choose_test(0)
		if phase!=1 or not lift_pending: errors.append("Recorder progression")
		await use_lift()
		await get_tree().physics_frame
		var walk_start: Vector3=hero.position
		Input.action_press("back")
		await get_tree().create_timer(0.25).timeout
		Input.action_release("back")
		if hero.position.distance_to(walk_start)<0.2: errors.append("Movement blocked at lift exit")
		# Exercise timed combo hits, mitigation, parry and cooldowns against an actor.
		for enemy in enemies.duplicate(): enemy.damage(10000)
		var foe := spawn_guard(player.position+Vector3(0,0,-2))
		foe.set_physics_process(false)
		foe.hp=1000; foe.max_hp=1000
		hero.yaw=0
		hero.strike()
		await get_tree().create_timer(0.4).timeout
		if foe.hp>=1000: errors.append("Combo did not damage target")
		hero.cooldown=0; hero.strike()
		if hero.combo!=1: errors.append("Combo did not chain")
		await get_tree().create_timer(0.4).timeout
		hero.blocking=true; hero.parry_left=0.2; hero.invulnerable=0
		var prior_hp: float=hero.hp
		hero.receive_attack(20,foe)
		if hero.hp!=prior_hp or foe.stun<1: errors.append("Parry failed")
		hero.blocking=true; hero.parry_left=0
		hero.receive_attack(20,foe)
		if not is_equal_approx(hero.hp,prior_hp-3): errors.append("Block mitigation failed")
		hero.blocking=false; hero.invulnerable=1
		prior_hp=hero.hp; hero.receive_attack(20,foe)
		if hero.hp!=prior_hp: errors.append("Evade invulnerability failed")
		hero.invulnerable=0; hero.pulse=100
		var before_gravity: float=foe.hp
		hero.gravity()
		if foe.hp>=before_gravity or hero.gravity_cd<=0: errors.append("Gravity failed")
		var spent: float=hero.pulse
		hero.gravity()
		if hero.pulse!=spent: errors.append("Gravity cooldown failed")
		foe.damage(10000)
		var blink_target := spawn_guard(player.position+Vector3(0,0,-5))
		blink_target.set_physics_process(false)
		hero.stamina=100; hero.blink_cd=0
		var blink_start: Vector3=hero.position
		hero.blink()
		if hero.blink_cd<=0 or hero.position.distance_to(blink_start)<1: errors.append("Blink failed")
		var blink_end: Vector3=hero.position
		hero.blink()
		if hero.position!=blink_end: errors.append("Blink cooldown failed")
		blink_target.damage(10000)
		hero.pulse=100
		Input.action_press("pulse")
		await get_tree().physics_frame
		await get_tree().physics_frame
		Input.action_release("pulse")
		if slow_time<=0 or hero.pulse>5: errors.append("Time fracture failed")
		player.position=target_point
		interact()
		if phase!=2: errors.append("Security progression")
		player.position=target_point
		interact()
		choose_test(0 if heroine else 1)
		if phase!=3 or trust_mara!=heroine: errors.append("Witness choice")
		await use_lift()
		if enemies.size()!=(4 if heroine else 6): errors.append("Witness consequence")
		for enemy in enemies.duplicate(): enemy.damage(10000)
		await get_tree().create_timer(0.1).timeout
		if phase!=4: errors.append("Ambush completion")
		player.position=target_point
		interact()
		choose_test(0 if heroine else 1)
		if phase!=5 or broadcast!=heroine: errors.append("Archive choice")
		if enemies.size()!=1: errors.append("Boss missing")
		else:
			var boss_actor: Combatant=enemies[0]
			if boss_actor.max_hp!=(750 if heroine else 550): errors.append("Boss choice consequence")
			boss_actor.damage(boss_actor.max_hp*0.4)
			boss_actor.ai(0)
			if boss_actor.enemy_phase!=2 or enemies.size()!=2: errors.append("Boss second phase")
			boss_actor.invulnerable=0
			boss_actor.damage(boss_actor.max_hp*0.4)
			boss_actor.ai(0)
			if boss_actor.enemy_phase!=3 or enemies.size()!=3: errors.append("Boss third phase")
			boss_actor.invulnerable=0
			for enemy in enemies.duplicate(): enemy.damage(10000)
		await get_tree().create_timer(0.1).timeout
		if phase!=6: errors.append("Boss completion")
		player.position=target_point
		interact()
		if playing: errors.append("Ending not reached")
		print("STORY REACHED ",phase," / ","Ena/broadcast/trust" if heroine else "Aro/destroy/evacuate")
	# Failure, restart and pause are tested separately from the victory path.
	await start_mission(3)
	pause_game()
	if playing or world.process_mode!=Node.PROCESS_MODE_DISABLED: errors.append("Pause failed")
	resume_game()
	player.damage(10000)
	if playing: errors.append("Death failed")
	await start_mission(checkpoint_phase)
	if not playing or phase!=3 or player.hp<=0: errors.append("Checkpoint retry failed")
	playing=false
	for message in errors: push_error("TEST: "+message)
	print("CINEMATIC TEST ","PASS" if errors.is_empty() else "FAIL", " / ", errors.size(), " errors")
	clear_scene()
	await get_tree().process_frame
	await get_tree().process_frame
	get_tree().quit(0 if errors.is_empty() else 1)

func choose_test(index: int) -> void:
	if not is_instance_valid(overlay): return
	var buttons := overlay.find_children("*","Button",true,false)
	buttons[index].pressed.emit()

func capture_cinematic() -> void:
	await get_tree().create_timer(4).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/choir-title.png")
	await start_mission(0)
	await get_tree().create_timer(4).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/choir-game.png")
	await start_mission(1)
	await use_lift()
	await get_tree().create_timer(1).timeout
	(player as Combatant).strike()
	await get_tree().create_timer(0.22).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/choir-combat.png")
	print("CAPTURE FPS ",Engine.get_frames_per_second()," / memory MB ",OS.get_static_memory_usage()/1048576)
	for enemy in enemies.duplicate(): enemy.damage(10000)
	set_phase(2)
	player.position=target_point+Vector3(0,0,2)
	interact()
	await get_tree().create_timer(2).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test-output/choir-dialogue.png")
	get_tree().quit()
