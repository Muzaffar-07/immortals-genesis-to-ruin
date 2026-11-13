extends Node
class_name NightSound

var clips := {}
var enabled := true
var active := 0

func _ready() -> void:
	for category in ["footstep_grass","footstep_concrete","impactPunch_heavy","impactMetal_heavy","impactBell_heavy"]:
		clips[category] = []
		for i in 5:
			var path := "res://assets/audio/%s_%03d.ogg" % [category,i]
			if ResourceLoader.exists(path): clips[category].append(load(path))

func play_at(category: String, pos: Vector3, volume: float = 0, pitch: float = 1) -> void:
	if not enabled or active > 18 or not clips.has(category) or clips[category].is_empty(): return
	var player := AudioStreamPlayer3D.new()
	add_child(player)
	player.position = pos
	player.stream = clips[category].pick_random()
	player.volume_db = volume
	player.pitch_scale = pitch
	player.max_distance = 45
	player.unit_size = 5
	active += 1
	player.finished.connect(func(): active -= 1; player.queue_free())
	player.play()
