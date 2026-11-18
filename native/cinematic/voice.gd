extends Node
class_name VoicePerformance

var lines := {}
var player: AudioStreamPlayer
var actor: HumanAvatar
var current := ""
var game: Node3D
var enabled := true

func setup(owner_game: Node3D) -> void:
	game=owner_game
	process_mode=Node.PROCESS_MODE_ALWAYS
	if FileAccess.file_exists("res://assets/voice/lines.json"):
		lines=JSON.parse_string(FileAccess.get_file_as_string("res://assets/voice/lines.json"))
	player=AudioStreamPlayer.new()
	add_child(player)
	player.volume_db=-1
	player.finished.connect(stop)

func play_line(id: String, face: HumanAvatar = null) -> float:
	stop()
	if not lines.has(id): return 0
	current=id
	actor=face
	player.stream=load("res://assets/voice/"+id+".ogg")
	player.volume_db=-1 if enabled else -80
	player.play()
	if is_instance_valid(game.music): game.music.volume_db=-32
	return float(lines[id].duration)

func find_line(text: String) -> String:
	for id in lines:
		if lines[id].text==text: return id
	return ""

func stop() -> void:
	if is_instance_valid(actor):
		actor.speech_strength=0
		actor.action_left=0
		actor.play("idle")
	actor=null
	current=""
	if is_instance_valid(player):
		player.stop()
		player.stream_paused=false
	if is_instance_valid(game) and is_instance_valid(game.music): game.music.volume_db=-23

func _process(delta: float) -> void:
	if not is_instance_valid(actor) or current=="": return
	var time := player.get_playback_position()
	var line: Dictionary=lines[current]
	var envelope: Array=line.envelope
	var sample := mini(int(time/float(line.envelope_step)),envelope.size()-1)
	var amplitude := float(envelope[sample]) if sample>=0 and player.playing else 0.0
	actor.speech_clock=time
	actor.speech_strength=lerpf(actor.speech_strength,amplitude,minf(1,delta*24))
