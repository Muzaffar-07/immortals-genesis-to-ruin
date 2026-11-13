extends Fighter
class_name Combatant

var human: HumanAvatar
var nav: NavigationAgent3D
var role := "guard"
var combo := 0
var combo_window := 0.0
var hit_at := -1.0
var attack_left := 0.0
var hit_targets: Array = []
var blocking := false
var parry_left := 0.0
var stun := 0.0
var dead := false
var blink_cd := 0.0
var gravity_cd := 0.0
var slow_left := 0.0
var ai_clock := 0.0
var lock_target: Combatant
var active := false
var shake := 0.0
var phase_seen := 1

func setup_cast(owner_game: Node3D, cast: String, hostile: bool = false, leader: bool = false) -> void:
	game = owner_game
	role = cast
	enemy = hostile
	boss = leader
	collision_layer = 2 if hostile else 4
	collision_mask = 1
	floor_snap_length = 0.6
	floor_max_angle = deg_to_rad(52)
	var col := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.height = 1.8
	capsule.radius = 0.32
	col.shape = capsule
	col.position.y = 0.9
	add_child(col)
	human = HumanAvatar.new()
	avatar = human
	add_child(human)
	human.configure_cast(cast)
	max_hp = 650 if boss else 85 if enemy else 150
	hp = max_hp
	if enemy:
		nav = NavigationAgent3D.new()
		add_child(nav)
		nav.path_desired_distance = 0.7
		nav.target_desired_distance = 1.5
	else:
		pivot = Node3D.new()
		add_child(pivot)
		pivot.position.y = 1.5
		arm = SpringArm3D.new()
		pivot.add_child(arm)
		arm.spring_length = 3.5
		arm.collision_mask = 1
		arm.margin = 0.25
		camera = Camera3D.new()
		arm.add_child(camera)
		camera.fov = 72
		camera.position.x = 0.45
		camera.current = true
		pitch = -0.12
		game.world.light(self,Vector3(0,1.6,0.5),Color(0.38,0.65,0.9),0.55,3)

func _physics_process(delta: float) -> void:
	if dead or not game.playing: return
	var dt := delta * (0.28 if enemy and game.slow_time > 0 else 1.0)
	for key in ["cooldown","invulnerable","combo_window","parry_left","stun","blink_cd","gravity_cd"]:
		set(key,maxf(0,float(get(key))-dt))
	if stun > 0:
		velocity.x = move_toward(velocity.x,0,dt*12)
		velocity.z = move_toward(velocity.z,0,dt*12)
	elif enemy: ai(dt)
	else: controls(dt)
	if attack_left > 0:
		attack_left -= dt
		if hit_at >= 0:
			hit_at -= dt
			if hit_at <= 0:
				hit_at = -1
				resolve_hit()
	velocity.y -= 24*dt
	move_and_slide()
	human.animate(Vector2(velocity.x,velocity.z).length(),dt)
	if position.y < -40:
		if enemy: damage(10000)
		else: game.fail("LOST BELOW","You fell beneath the containment decks.")

func controls(delta: float) -> void:
	var movement := Input.get_vector("left","right","forward","back")
	var direction := Vector3(movement.x,0,movement.y).rotated(Vector3.UP,yaw)
	blocking = Input.is_action_pressed("block") and stamina > 0 and attack_left <= 0
	if Input.is_action_just_pressed("block"): parry_left = 0.2
	stamina = minf(100,stamina+delta*(9 if blocking else 23))
	pulse = minf(100,pulse+delta*2)
	var sprint := Input.is_action_pressed("sprint") and stamina > 5 and movement.length()>0
	speed = 6.8 if sprint else 4.3
	if sprint: stamina -= delta*15
	if blocking: speed = 2; human.play("block",0.15)
	if attack_left > 0: speed *= 0.3
	if Input.is_action_just_pressed("jump") and is_on_floor(): velocity.y = 7.5
	if Input.is_action_just_pressed("dodge") and stamina >= 24:
		stamina -= 24
		dodge_time = 0.24
		invulnerable = 0.38
		dodge_direction = direction if direction.length()>0.1 else Vector3(0,0,-1).rotated(Vector3.UP,yaw)
		game.world.burst(position+Vector3.UP,Color(0.1,0.65,1),18)
	if dodge_time>0:
		dodge_time -= delta
		direction = dodge_direction
		speed = 14
	velocity.x = direction.x*speed
	velocity.z = direction.z*speed
	if direction.length()>0.1 and attack_left<=0: avatar.rotation.y = lerp_angle(avatar.rotation.y,atan2(direction.x,direction.z),delta*14)
	if Input.is_action_just_pressed("lock"): lock_target = nearest(22)
	if is_instance_valid(lock_target) and not lock_target.dead:
		var off := lock_target.position-position
		yaw = lerp_angle(yaw,atan2(-off.x,-off.z),delta*5)
	pivot.rotation = Vector3(pitch,yaw,0)
	shake = maxf(0,shake-delta*1.6)
	camera.h_offset = sin(Time.get_ticks_msec()*0.1)*shake*0.08
	camera.fov = lerpf(camera.fov,79.0 if sprint else 72.0,delta*6)
	if direction.length()>0.1 and is_on_floor():
		foot_time -= delta
		if foot_time<=0:
			foot_time = 0.28 if sprint else 0.44
			game.sound.play_at("footstep_concrete",position,-18,1.1)
	if Input.is_action_pressed("attack") and cooldown<=0 and not blocking: strike()
	if Input.is_action_just_pressed("blink"): blink()
	if Input.is_action_just_pressed("gravity"): gravity()
	if Input.is_action_just_pressed("pulse") and pulse>=100:
		pulse = 0
		game.slow_time = 6
		game.world.shockwave(position,10,Color(0.35,0.6,1))
		game.toast("TIME FRACTURE  /  SIX SECONDS",3)
	if Input.is_action_just_pressed("interact"): game.interact()

func nearest(radius: float) -> Combatant:
	var result: Combatant
	var distance := radius
	for target in game.enemies:
		if target.dead: continue
		var d: float = position.distance_to(target.position)
		if d < distance and clear_sight(target): distance=d; result=target
	return result

func clear_sight(target: Node3D) -> bool:
	return get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(position+Vector3.UP,target.position+Vector3.UP,1)).is_empty()

func strike() -> void:
	combo = (combo+1)%3 if combo_window>0 else 0
	combo_window = 1.25
	attack_left = 0.48 if combo<2 else 0.64
	cooldown = attack_left
	hit_at = 0.18 if combo<2 else 0.3
	hit_targets.clear()
	human.play(["combo","kick","roundhouse"][combo],attack_left,2.5)
	var target := nearest(4.5)
	if target:
		var off := target.position-position
		human.rotation.y = atan2(off.x,off.z)
		if off.length()>2.2: velocity += off.normalized()*5
	else: human.rotation.y = yaw+PI

func resolve_hit() -> void:
	game.world.slash(position,human.rotation.y,combo)
	game.sound.play_at("impactMetal_heavy",position,-12,1.5)
	for target in game.enemies.duplicate():
		var offset: Vector3 = target.position-position
		if not target.dead and offset.length()<3.5 and Vector3(0,0,1).rotated(Vector3.UP,human.rotation.y).dot(offset.normalized())>0.15 and clear_sight(target):
			target.damage([27,34,52][combo])
			target.stun = 0.08 if target.boss else 0.35 if combo<2 else 0.8
			target.velocity += offset.normalized()*(3 if combo<2 else 8)
			pulse = minf(100,pulse+10)
			shake = 0.5
			game.register_hit(combo)

func blink() -> void:
	if blink_cd>0 or stamina<25: return
	var target := nearest(16)
	if not target: game.toast("No visible target in blink range",1.5); return
	var destination := target.position+(position-target.position).normalized()*1.8
	var motion := destination-position
	if test_move(global_transform,motion): return
	blink_cd = 5
	stamina -= 25
	game.beam(position+Vector3.UP,destination+Vector3.UP)
	position = destination
	invulnerable = 0.45
	combo_window = 1
	combo = 1
	strike()
	game.world.shockwave(position,3,Color(0.1,0.8,1))

func gravity() -> void:
	if gravity_cd>0 or pulse<35: return
	gravity_cd = 9
	pulse -= 35
	human.play("kick",0.55,2)
	game.world.shockwave(position,9,Color(0.65,0.25,1))
	for target in game.enemies.duplicate():
		if target.position.distance_to(position)<9 and clear_sight(target):
			target.damage(24)
			target.stun = 1.4
			target.velocity = (position-target.position).normalized()*9+Vector3.UP*3

func ai(delta: float) -> void:
	var target: Combatant = game.player
	var offset := target.position-position
	var distance := offset.length()
	if boss:
		enemy_phase=1+int((1-hp/max_hp)*2.9)
		if enemy_phase>phase_seen:
			phase_seen=enemy_phase
			invulnerable=1.2
			game.world.shockwave(position,6,Color(1,0.2,0.08))
			game.hazard(position,4.5,1.0,32)
			game.say("VOSS","There is more than one of me." if enemy_phase==2 else "Every death is another beginning.",4)
			game.spawn_guard(position+Vector3(3,0,4))
	if distance<24: active=true
	if not active: velocity.x=0; velocity.z=0; return
	ai_clock -= delta
	if ai_clock<=0:
		ai_clock = 0.35
		nav.target_position = target.position
	var direction := (nav.get_next_path_position()-position).normalized()
	direction.y = 0
	velocity.x = direction.x*(3.8 if boss else 3.1)
	velocity.z = direction.z*(3.8 if boss else 3.1)
	human.rotation.y = lerp_angle(human.rotation.y,atan2(offset.x,offset.z),delta*8)
	if windup>0:
		velocity.x=0; velocity.z=0
		windup -= delta
		if windup<=0:
			if distance<3: target.receive_attack((24+enemy_phase*3) if boss else 14,self)
			elif role=="guard" and distance<18 and clear_sight(target):
				game.beam(position+Vector3.UP*1.4,target.position+Vector3.UP)
				target.receive_attack(10,self)
				human.play("shoot",0.4)
		return
	if cooldown<=0 and clear_sight(target) and (distance<2.7 or role=="guard" and distance<16):
		windup = 0.8 if boss else 1.0
		cooldown = 2.1 if boss else 2.7
		human.play("aim" if role=="guard" and distance>=3 else "combo",windup,1.5)
		game.world.ring(position,1.2,Color(1,0.2,0.06),windup)
	if boss and cooldown<=0 and distance>=3 and distance<20:
		cooldown = 3.5
		enemy_phase = 1+int((1-hp/max_hp)*2.9)
		game.hazard(target.position,2.7,1.2,25)
		if enemy_phase>=2: game.hazard(target.position+Vector3(3,0,0),2.5,1.8,22)

func receive_attack(amount: float, attacker: Combatant) -> void:
	if invulnerable>0: return
	if blocking and stamina>=12:
		stamina -= 12
		if parry_left>0:
			attacker.stun=1.7
			attacker.damage(22)
			pulse=minf(100,pulse+18)
			game.world.shockwave(position,3,Color(1,0.8,0.25))
			game.toast("PERFECT PARRY",1)
			return
		amount *= 0.15
	damage(amount)

func damage(amount: float) -> void:
	if dead or invulnerable>0: return
	hp -= amount
	if enemy:
		active=true
		human.play("hit",0.25,1.4)
		game.world.burst(position+Vector3.UP,Color(0.5,0.015,0.025) if game.gore else Color(0.5,0.7,1),15)
	else:
		game.hurt_flash = 0.35
		shake=0.8
	if hp<=0:
		dead=true
		if enemy:
			human.play("death",2)
			human.dead=true
			game.enemy_died(self)
		else: game.fail("THE CHOIR FALLS SILENT","Watch the orange windups. Parry, evade, and use time fracture to regain control.")
