shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never;
uniform float fade = 1.0;
uniform vec4 tint : source_color = vec4(0.15,0.7,1.0,1.0);
void fragment() {
	float band = smoothstep(0.0,0.35,UV.x)*(1.0-smoothstep(0.6,1.0,UV.x));
	float tip = sin(UV.y*3.14159265);
	ALBEDO = tint.rgb;
	EMISSION = tint.rgb * 1.8;
	ALPHA = band * tip * fade * 0.75;
}
