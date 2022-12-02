import { defs, tiny } from './examples/common.js';

const {
  Vector,
  Vector3,
  vec,
  vec3,
  vec4,
  color,
  hex_color,
  Shader,
  Matrix,
  Mat4,
  Light,
  Shape,
  Material,
  Scene,
  Texture,
} = tiny;

const { Cube, Axis_Arrows, Textured_Phong } = defs;

export class Assignment4 extends Scene {
  /**
   *  **Base_scene** is a Scene that can be added to any display canvas.
   *  Setup the shapes, materials, camera, and lighting here.
   */
  constructor() {
    // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
    super();

    // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
    //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
    //        a cube instance's texture_coords after it is already created.
    this.shapes = {
      cube1: new Cube(),
      cube2: new Cube(),
      axis: new Axis_Arrows(),
    };

    console.log(this.shapes.cube1.arrays.texture_coord);

    // Cube 2 texture applied to each face, zoomed out by 50% (image should shrink)
    // Entire image will appear 4 times, once in each corner
    this.shapes.cube2.arrays.texture_coord =
      this.shapes.cube2.arrays.texture_coord.map((x) => x.times(2));

    // TODO:  Create the materials required to texture both cubes with the correct images and settings.
    //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
    //        you get to requirements 6 and 7 you will need different ones.
    this.materials = {
      phong: new Material(new Textured_Phong(), {
        color: hex_color('#ffffff'),
      }),
      texture: new Material(new Textured_Phong(), {
        color: hex_color('#ffffff'),
        ambient: 0.5,
        diffusivity: 0.1,
        specularity: 0.1,
        texture: new Texture('assets/stars.png'),
      }),

      //Stars
      texture1: new Material(new Texture_Rotate(), {
        color: hex_color('#000000'),
        ambient: 1,
        texture: new Texture('assets/stars.png', 'NEAREST'),
      }),

      //Earth
      texture2: new Material(new Texture_Scroll_X(), {
        color: hex_color('#000000'),
        ambient: 1,
        texture: new Texture('assets/earth.gif', 'LINEAR_MIPMAP_LINEAR'),
      }),
    };

    this.initial_camera_location = Mat4.look_at(
      vec3(0, 10, 20),
      vec3(0, 0, 0),
      vec3(0, 1, 0)
    );
    this.Rotating = false;

    // Initial Cube Position
    this.cube1_transform = Mat4.identity().times(Mat4.translation(-2, 0, 0, 0));
    this.cube2_transform = Mat4.identity().times(Mat4.translation(2, 0, 0, 0));
  }

  make_control_panel() {
    // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
    this.key_triggered_button(
      'Start/Stop Rotation',
      ['c'],
      () => (this.rotation = !this.rotation)
    );
  }

  display(context, program_state) {
    if (!context.scratchpad.controls) {
      this.children.push(
        (context.scratchpad.controls = new defs.Movement_Controls())
      );
      program_state.set_camera(Mat4.translation(0, 0, -8));
    }

    program_state.projection_transform = Mat4.perspective(
      Math.PI / 4,
      context.width / context.height,
      1.0,
      100
    );

    const light_position = vec4(10, 10, 10, 1);
    program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

    let t = program_state.animation_time / 1000,
      dt = program_state.animation_delta_time / 1000;
    let model_transform = Mat4.identity();

    if (this.rotation) {
      let theta1 = ((Math.PI * 3) / 2) * dt;
      this.cube1_transform = this.cube1_transform.times(
        Mat4.rotation(theta1, 1, 0, 0)
      );

      let theta2 = Math.PI * dt;
      this.cube2_transform = this.cube2_transform.times(
        Mat4.rotation(theta2, 0, 1, 0)
      );
    }

    this.shapes.cube1.draw(
      context,
      program_state,
      this.cube1_transform,
      this.materials.texture1
    );
    this.shapes.cube2.draw(
      context,
      program_state,
      this.cube2_transform,
      this.materials.texture2
    );
  }
}

class Texture_Scroll_X extends Textured_Phong {
  // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
  fragment_glsl_code() {
    return (
      this.shared_glsl_code() +
      `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                float translation = mod(animation_time, 4.0) * 2.; 
                mat4 matrix = mat4(vec4(-1, 0, 0, 0), vec4( 0, 1, 0, 0), vec4( 0, 0, 1, 0), vec4(translation, 0, 0, 1)); 
                vec4 new_tex_coord = vec4(f_tex_coord, 0, 0) + vec4(1, 1, 0, 1); 
                new_tex_coord = matrix * new_tex_coord; 
                vec4 tex_color = texture2D(texture, new_tex_coord.xy);

                //Edges
                float u = mod(new_tex_coord.x, 1.0);
                float v = mod(new_tex_coord.y, 1.0);
                if (v > 0.15 && v < 0.25 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if (u > 0.15 && u < 0.25 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if (u > 0.75 && u < 0.85 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if (v > 0.75 && v < 0.85 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if( tex_color.w < 0.01 ) discard;

                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 

                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `
    );
  }
}

class Texture_Rotate extends Textured_Phong {
  // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
  fragment_glsl_code() {
    return (
      this.shared_glsl_code() +
      `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                float theta = 3.14159265 * 0.5 * mod(animation_time, 4.0); 
                mat4 matrix = mat4(vec4(cos(theta), sin(theta), 0, 0), vec4(sin(theta), -cos(theta), 0, 0), vec4( 0, 0, 1, 0), vec4( 0, 0, 0, 1));
                vec4 new_tex_coord = vec4(f_tex_coord, 0, 0) + vec4(-0.5, -0.5, 0, 0);
                new_tex_coord = (matrix * new_tex_coord) + vec4(0.5, 0.5, 0, 0);       
                vec4 tex_color = texture2D(texture, new_tex_coord.xy);
                
                 float u = mod(new_tex_coord.x, 1.0);
                 float v = mod(new_tex_coord.y, 1.0);
                
                // Edges
                if (u > 0.75 && u < 0.85 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if (v > 0.75 && v < 0.85 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if (u > 0.15 && u < 0.25 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if (v > 0.15 && v < 0.25 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1);
                }
                if( tex_color.w < 0.01 ) discard;

                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 

                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `
    );
  }
}
