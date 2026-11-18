shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx, sss_mode_skin;
uniform sampler2D complexion : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D oil_map : filter_linear_mipmap_anisotropic;
uniform sampler2D pores : hint_normal, filter_linear_mipmap;
uniform vec4 tone : source_color = vec4(1.0);
void fragment() {
	ALBEDO = texture(complexion,UV).rgb * tone.rgb;
	ROUGHNESS = clamp(texture(oil_map,UV).g,0.42,0.82);
	SPECULAR = 0.32;
	METALLIC = 0.0;
	NORMAL_MAP = texture(pores,UV*32.0).rgb;
	NORMAL_MAP_DEPTH = 0.04;
	SSS_STRENGTH = 0.12;
	SSS_TRANSMITTANCE_COLOR = vec4(0.6,0.18,0.12,1.0);
	SSS_TRANSMITTANCE_DEPTH = 0.035;
}
