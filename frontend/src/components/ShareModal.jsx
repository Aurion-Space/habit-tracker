import { useState, useRef, useEffect } from 'react';
import { getCategoryById } from '../data/templates';

export default function ShareModal({ habit, onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      generateCard();
    }
  }, []);

  const generateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 600;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e1b4b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative circles
    ctx.beginPath();
    ctx.arc(500, 100, 150, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, 350, 100, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.fill();

    // Category badge background
    const category = getCategoryById(habit.category);
    ctx.fillStyle = `${category.color}20`;
    roundRect(ctx, 40, 40, 150, 40, 20);
    ctx.fill();

    // Category badge text
    ctx.fillStyle = category.color;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(`${category.icon} ${category.name}`, 60, 65);

    // Main streak number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(habit.currentStreak, width / 2, 200);

    // Days text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillText('DAY STREAK', width / 2, 250);

    // Habit name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, sans-serif';
    const truncatedName = habit.name.length > 25 ? habit.name.slice(0, 25) + '...' : habit.name;
    ctx.fillText(truncatedName, width / 2, 310);

    // Streak milestone indicator
    const milestones = [3, 7, 14, 21, 30, 60, 90, 100, 365];
    const achievedMilestone = milestones.find(m => m <= habit.currentStreak && habit.currentStreak < m * 2);
    
    if (achievedMilestone) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(`🏆 ${achievedMilestone} Day Milestone Achieved!`, width / 2, 350);
    }

    // App branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('🌱 Habit Tracker', width / 2, 385);
  };

  const roundRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `habit-streak-${habit.currentStreak}-days.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyText = () => {
    const text = `🔥 I just hit ${habit.currentStreak} days streak on "${habit.name}" using Habit Tracker! 🌱`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `🔥 I just hit ${habit.currentStreak} days streak on "${habit.name}"!`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Habit Streak!',
          text: shareText,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
  };

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="glass-modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-text">📤 Share Achievement</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Preview Card */}
        <div className="flex justify-center mb-6">
          <div className="share-card glow-green">
            <canvas ref={canvasRef} className="w-full max-w-sm rounded-xl" />
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className="w-full glass-btn-primary py-3 flex items-center justify-center gap-2"
          >
            📥 Download Image
          </button>

          <button
            onClick={handleCopyText}
            className="w-full glass-btn py-3 flex items-center justify-center gap-2"
          >
            {copied ? '✓ Copied!' : '📋 Copy Text'}
          </button>

          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full glass-btn py-3 flex items-center justify-center gap-2"
            >
              📱 Share
            </button>
          )}
        </div>

        {/* Twitter/X Share */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + ' 🌱 #habittracker #productivity')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mt-3 glass-btn py-3 text-center text-sm"
        >
          Share on X (Twitter)
        </a>

        <button onClick={onClose} className="w-full mt-4 text-gray-400 hover:text-white py-2 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}
