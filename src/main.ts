import { createApp } from './app';

function showFatalError(message: string): void {
    document.body.innerHTML = `
        <div style="
            position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
            background:#0f0e2a;color:#f0ece4;font-family:'Nunito',system-ui,sans-serif;
            text-align:center;padding:2rem;
        ">
            <div>
                <h1 style="font-size:1.5rem;margin-bottom:1rem;">planetearth.live</h1>
                <p style="opacity:0.7;max-width:400px;line-height:1.6;">${message}</p>
            </div>
        </div>`;
}

if (!window.WebGLRenderingContext && !(window as unknown as Record<string, unknown>).WebGL2RenderingContext) {
    showFatalError('Tu navegador no soporta WebGL. Por favor usa Chrome, Firefox, Safari o Edge actualizado.');
} else {
    try {
        createApp();
    } catch (err) {
        console.error('planetearth.live initialization failed:', err);
        showFatalError('Error al inicializar la visualización. Por favor recarga la página o prueba otro navegador.');
    }
}
