import { useEffect, useRef } from 'react';

export function AudioVisualizer({ analyser, isRecording }: { analyser: AnalyserNode | null, isRecording: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!analyser || !isRecording || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fit canvas to parent container nicely
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let animationFrame: number;
    
    const draw = () => {
      if (!isRecording) return;
      animationFrame = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2;
      let barHeight;
      let x = 0;
      
      const centerY = canvas.height / 2;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        ctx.fillStyle = `rgb(245, 158, 11)`; // accent color
        
        // Draw centered vertically
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
        
        x += barWidth;
      }
    };
    
    draw();
    
    return () => cancelAnimationFrame(animationFrame);
  }, [analyser, isRecording]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-12 rounded-lg bg-[#151515] border border-white/5"
    />
  );
}
