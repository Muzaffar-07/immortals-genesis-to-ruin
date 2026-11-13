extends CharacterBody3D
class_name Fighter

var avatar: ImmortalAvatar
var game: Node3D
var enemy := false
var boss := false
var hp := 100.0
var max_hp := 100.0
var stamina := 100.0
var pulse := 100.0
var speed := 0.0
var cooldown := 0.0
var invulnerable := 0.0
var windup := 0.0
var dodge_time := 0.0
var foot_time := 0.0
var dodge_direction := Vector3.ZERO
var yaw := 0.0
var pitch := -0.2
var arm: SpringArm3D
var pivot: Node3D
var camera: Camera3D
var enemy_phase := 1

func setup(owner_game: Node3D, female: bool, hostile: bool = false, is_boss: bool = false) -> void:
	game = owner_game
	enemy = hostile
	boss = is_boss
	collision_layer = 2 if enemy else 4
	collision_mask = 1
	var collision := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.height = 1.8
	shape.radius = 0.33
	collision.shape = shape
	collision.position.y = 0.9
	add_child(collision)
	avatar = ImmortalAvatar.new()
	add_child(avatar)
	avatar.configure(female,enemy)
	if enemy:
		max_hp = 900 if boss else 45
		hp = max_hp
		if boss: avatar.scale = Vector3.ONE*2.9
		else: avatar.scale = Vector3(1.05,1.18,1.05)
	else:
		pivot = Node3D.new()
		add_child(pivot)
		pivot.position = Vector3(0,1.5,0)
		arm = SpringArm3D.new()
		pivot.add_child(arm)
		arm.spring_length = 4.3
		arm.margin = 0.15
		arm.collision_mask = 1
		camera = Camera3D.new()
		arm.add_child(camera)
		camera.fov = 68
		camera.position.x = 0.65
		camera.current = true

func _physics_process(delta: float) -> void:
	if not game.playing: return
	cooldown = maxf(0,cooldown-delta)
	invulnerable = maxf(0,invulnerable-delta)
	if enemy: ai(delta)
	else: controls(delta)
	velocity.y -= 20*delta
	move_and_slide()
	avatar.animate(Vector2(velocity.x,velocity.z).length(),delta)

func controls(delta: float) -> void:
	var input := Input.get_vector("left","right","forward","back")
	var direction := Vector3(input.x,0,input.y).rotated(Vector3.UP,yaw)
	var sprint := Input.is_action_pressed("sprint") and stamina > 3 and input.length()>0.1
	stamina = clampf(stamina+(-16 if sprint else 23)*delta,0,100)
	pulse = minf(100,pulse+3*delta)
	speed = 6.7 if sprint else 4.1
	if Input.is_action_just_pressed("dodge") and stamina >= 22 and dodge_time <= 0:
		dodge_time = 0.27
		invulnerable = 0.5
		stamina -= 22
		dodge_direction = direction if direction.length() > 0.1 else Vector3(0,0,-1).rotated(Vector3.UP,yaw)
		game.world.burst(position+Vector3.UP,Color(0.15,0.7,1),12)
	if dodge_time > 0:
		dodge_time -= delta
		direction = dodge_direction
		speed = 15
	velocity.x = direction.x*speed
	velocity.z = direction.z*speed
	if direction.length() > 0.1:
		avatar.rotation.y = lerp_angle(avatar.rotation.y,atan2(direction.x,direction.z),delta*12)
		foot_time -= delta
		if foot_time <= 0:
			game.sound.play_at("footstep_grass",position, -12,randf_range(0.9,1.1))
			foot_time = 0.27 if sprint else 0.43
	pivot.rotation = Vector3(pitch,yaw,0)
	if Input.is_action_pressed("attack") and cooldown == 0: strike()
	if Input.is_action_just_pressed("pulse") and pulse >= 100:
		pulse = 0
		game.world.ring(position,8,Color(0.2,0.8,1),0.6)
		game.sound.play_at("impactBell_heavy",position,-4,0.6)
		for e in game.enemies.duplicate():
			if is_instance_valid(e) and e.position.distance_to(position) < 8: e.damage(55)
		hp = minf(max_hp,hp+20)
	if Input.is_action_just_pressed("interact"): game.interact()

func strike() -> void:
	cooldown = 0.42
	avatar.attack_time = 0.3
	avatar.rotation.y = yaw+PI
	var origin := camera.global_position
	var direction := -camera.global_basis.z
	var best: Fighter
	var best_dot := 0.88
	for target in game.enemies:
		if not is_instance_valid(target): continue
		var to_target: Vector3 = target.global_position+Vector3.UP*(2 if target.boss else 1)-origin
		var dot := direction.dot(to_target.normalized())
		if to_target.length() < 28 and dot > best_dot:
			var ray := PhysicsRayQueryParameters3D.create(origin,target.global_position+Vector3.UP,1)
			if get_world_3d().direct_space_state.intersect_ray(ray).is_empty():
				best = target
				best_dot = dot
	var end := best.position+Vector3.UP if best else position+direction*16+Vector3.UP
	game.beam(position+Vector3.UP,end)
	game.sound.play_at("impactMetal_heavy",position,-12,1.5)
	if best:
		best.damage(24)
		pulse = minf(100,pulse+6)

func ai(delta: float) -> void:
	if not is_instance_valid(game.player): return
	var target: Vector3 = game.player.position
	if game.stage == "defend" and not boss and get_instance_id()%3 == 0:
		target = game.world.objective.position
	var offset := target-position
	offset.y = 0
	var distance := offset.length()
	var direction := offset.normalized()
	if boss:
		enemy_phase = 1 + int((1-hp/max_hp)*2.99)
		if cooldown == 0:
			cooldown = 5.0-enemy_phase*0.6
			game.hazard(game.player.position,3.0+enemy_phase*0.5,1.6,23.0)
			if enemy_phase >= 2: game.hazard(game.player.position+Vector3(4,0,-3),3,2,18)
			if enemy_phase == 3: game.hazard(game.player.position+Vector3(-4,0,3),3,2,18)
	if windup > 0:
		windup -= delta
		velocity.x = 0
		velocity.z = 0
		if windup <= 0:
			if distance < (4.5 if boss else 2.7):
				if target == game.world.objective.position: game.objective_hp -= 6
				else: game.player.damage(22 if boss else 12)
			cooldown = 1.6
	elif distance < (3.6 if boss else 1.8) and cooldown == 0:
		windup = 0.7
		game.world.ring(position,2 if not boss else 4,Color(1,0.2,0.1),0.7)
	elif distance > (3.4 if boss else 1.5):
		var move_speed: float = 1.6 if boss else 2.4+game.chapter*0.08
		# Local steering separates enemies without blocking a player into a crowd.
		for other in game.enemies:
			if other == self or not is_instance_valid(other): continue
			var gap: Vector3 = position-other.position
			if gap.length() < 1.3: direction += gap.normalized()*0.6
		velocity.x = direction.x*move_speed
		velocity.z = direction.z*move_speed
	else:
		velocity.x = 0
		velocity.z = 0
	avatar.rotation.y = lerp_angle(avatar.rotation.y,atan2(direction.x,direction.z),delta*6)

func damage(amount: float) -> void:
	if invulnerable > 0: return
	hp -= amount*(game.difficulty if not enemy else 1.0)
	game.sound.play_at("impactPunch_heavy",position,-3,randf_range(0.7,1.1))
	game.world.burst(position+Vector3.UP,Color(0.4,0.01,0.02) if game.gore else Color(0.2,0.65,0.9),24)
	if not enemy:
		invulnerable = 0.6
		game.hurt_flash = 0.6
	if hp <= 0:
		if enemy:
			game.enemy_died(self)
			queue_free()
		else: game.fail("ETERNITY BREAKS", "Even immortals can be broken. Return to the beginning of this chapter.")
