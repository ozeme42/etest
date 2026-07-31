import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Users, Zap } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-container">
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text animate-fade-in">
            <h1 className="hero-title">
              Geleceğin Eğitim Platformuna <span className="gradient-text">Hoş Geldiniz</span>
            </h1>
            <p className="hero-subtitle">
              Sınavlara hazırlanmanın en keyifli, en dinamik ve en premium yolu. Öğrenciler için test çözme, öğretmenler için analiz!
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn btn-primary btn-lg">
                Hemen Test Çözmeye Başla
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg glass">
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features container">
        <div className="feature-card card glass">
          <div className="feature-icon bg-purple-light">
            <Zap size={32} color="var(--color-primary)" />
          </div>
          <h3>Hızlı ve Akıcı</h3>
          <p>Sıfır gecikme ile sorular arasında sörf yapın, anında geri bildirim alın.</p>
        </div>
        
        <div className="feature-card card glass">
          <div className="feature-icon bg-orange-light">
            <Trophy size={32} color="var(--color-secondary)" />
          </div>
          <h3>Liderlik Tablosu</h3>
          <p>Çözdüğünüz testlerle puan toplayın, okulunuzda veya sınıfınızda birinci olun.</p>
        </div>

        <div className="feature-card card glass">
          <div className="feature-icon bg-purple-light">
            <Users size={32} color="var(--color-primary)" />
          </div>
          <h3>Öğretmen Takibi</h3>
          <p>Öğretmenleriniz gelişiminizi izlesin, size özel testler hazırlasın.</p>
        </div>

        <div className="feature-card card glass">
          <div className="feature-icon bg-orange-light">
            <BookOpen size={32} color="var(--color-secondary)" />
          </div>
          <h3>Geniş Soru Havuzu</h3>
          <p>Binlerce kaliteli soru ile her ders için eksiksiz hazırlık yapın.</p>
        </div>
      </section>
    </div>
  );
}
