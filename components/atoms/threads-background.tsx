"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/*
 * Hilos: líneas finas en blanco que ondulan despacio sobre la tinta del marco (la idea de «Threads» de React Bits, reescrita en
 * WebGL sin dependencias y sin seguir al cursor). Optimizada para no pesar en la entrada:
 * - arranca cuando el navegador queda libre (`requestIdleCallback`), así no compite con la carga de la página;
 * - pinta a 30 cuadros por segundo, a media resolución (las líneas ya van difuminadas: no se nota) y solo en la franja donde
 *   viven las líneas;
 * - se detiene con la pestaña oculta y, con movimiento reducido, deja un solo cuadro quieto;
 * - solo desde 768 px (en el celular el marco no lleva tinta).
 */

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAGMENT = `precision mediump float;
uniform float t;
uniform vec2 r;
const int LINES = 30;
float perlin(vec2 P){
  vec2 Pi=floor(P);
  vec4 Pf=P.xyxy-vec4(Pi,Pi+1.);
  vec4 Pt=vec4(Pi.xy,Pi.xy+1.);
  Pt=Pt-floor(Pt*(1./71.))*71.;
  Pt+=vec2(26.,161.).xyxy;
  Pt*=Pt;
  Pt=Pt.xzxz*Pt.yyww;
  vec4 gx=fract(Pt*(1./951.135664))-.49999;
  vec4 gy=fract(Pt*(1./642.949883))-.49999;
  vec4 g=inversesqrt(gx*gx+gy*gy)*(gx*Pf.xzxz+gy*Pf.yyww)*1.41421356;
  vec2 b=Pf.xy*Pf.xy*Pf.xy*(Pf.xy*(Pf.xy*6.-15.)+10.);
  vec4 b2=vec4(b,vec2(1.-b));
  return dot(g,b2.zxzx*b2.wwyy);
}
float line(vec2 st,float w,float perc,float px){
  float split=.1+perc*.4;
  float amp=smoothstep(split,.7,st.x)*.5;
  float ts=t/10.;
  float blur=smoothstep(split,split+.05,st.x)*perc;
  float xn=mix(perlin(vec2(ts,st.x+perc)*2.5),perlin(vec2(ts,st.x+ts)*3.5)/1.5,st.x*.3);
  float y=.5+xn/2.*amp;
  float s=smoothstep(y+w/2.+10.*px*blur,y,st.y);
  float e=smoothstep(y,y-w/2.-10.*px*blur,st.y);
  return clamp((s-e)*(1.-smoothstep(0.,1.,pow(perc,.3))),0.,1.);
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  // Las líneas nunca salen de la franja central (amplitud máxima ≈ 0.16 más el difuminado): fuera de ella no se calcula nada.
  if(abs(uv.y-.5)>.2){gl_FragColor=vec4(0.);return;}
  float px=1./max(r.x,r.y);
  float k=1.;
  for(int i=0;i<LINES;i++){
    float p=float(i)/float(LINES);
    k*=1.-line(uv,7.*px*(1.-p),p,px);
  }
  float c=1.-k;
  gl_FragColor=vec4(vec3(c),c);
}`;

/** Resolución de pintado frente a la de la pantalla (las líneas son suaves: a la mitad se ven igual y cuesta una cuarta parte). */
const SCALE = 0.5;
const FRAME_MS = 1000 / 30;

export function ThreadsBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !window.matchMedia("(min-width: 768px)").matches) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power", premultipliedAlpha: true });
    if (!gl) return;

    let raf = 0;
    let idle = 0;
    let last = 0;
    let disposed = false;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    // Un triángulo que cubre la pantalla entera.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(program, "t");
    const uRes = gl.getUniformLocation(program, "r");

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    const draw = (ms: number) => {
      resize();
      gl.uniform1f(uTime, ms / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (ms - last < FRAME_MS) return;
      last = ms;
      draw(ms);
    };
    const start = () => {
      if (disposed) return;
      canvas.dataset.ready = "";
      if (still) {
        draw(12_000);
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    };
    const observer = new ResizeObserver(() => still && canvas.dataset.ready != null && draw(12_000));
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", () => cancelAnimationFrame(raf));
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle = ric(start, { timeout: 1200 });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (window.cancelIdleCallback ?? window.clearTimeout)(idle);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  // Aparece con un fundido al primer cuadro (`data-ready`), sin parpadeo; decorativo, no se anuncia ni recibe el puntero.
  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none size-full opacity-0 transition-opacity duration-(--d4) data-ready:opacity-50", className)} />;
}
