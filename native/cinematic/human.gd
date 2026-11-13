extends ImmortalAvatar
class_name HumanAvatar

var action_left := 0.0
var dead := false
var clips := {}

func configure_cast(role: String) -> void:
	var path := "res://assets/cast/"+role+".glb"
	if not scenes.has(path): scenes[path] = load(path)
	model = scenes[path].instantiate()
	add_child(model)
	animation = find_animation(model)
	for clip in animation.get_animation_list():
		var key: String = clip.to_lower()
		for pair in [["idle","idle"],["walk","walk"],["run","run"],["punch combo","combo"],["front kick","kick"],["roundhouse","roundhouse"],["block","block"],["hit","hit"],["death","death"],["talk","talk"],["rifle fire","shoot"],["rifle aim","aim"],["fighting stance","guard"]]:
			if key.begins_with(pair[0]): clips[pair[1]] = clip
		if key.contains("loop") or key in ["idle","walk","run"]: animation.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	play("idle")
	animation.advance(0)

func play(key: String, duration: float = 0, rate: float = 1) -> void:
	if not clips.has(key): key = "idle"
	if animation.current_animation != clips[key] or duration > 0:
		animation.play(clips[key],0.12,rate)
	action_left = duration

func animate(speed_value: float, delta: float) -> void:
	if dead: return
	action_left = maxf(0,action_left-delta)
	if action_left > 0: return
	play("run" if speed_value > 3.4 else "walk" if speed_value > 0.15 else "idle")
	animation.speed_scale = clampf(speed_value/4.3,0.8,1.5) if speed_value>0.15 else 1
