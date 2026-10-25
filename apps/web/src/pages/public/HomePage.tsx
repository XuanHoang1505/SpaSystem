import { Link } from 'react-router-dom';
import { SystemStatus } from '@components/common/SystemStatus/SystemStatus';
export function HomePage() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">NHƯ NGUYỆT SPA</p>
          <h1>
            Một khoảng lặng,
            <br />
            <em>dành riêng cho bạn.</em>
          </h1>
          <p className="hero-copy">
            Không gian chăm sóc da và trải nghiệm thư thái.
            <br />
            Nền tảng kết nối khách hàng, nhân viên và quản lý.
          </p>
          <Link className="link-button" to="/services">
            Khám phá dịch vụ <span aria-hidden="true">↗</span>
          </Link>
          <p className="phase-note">Phiên bản nền tảng · Tính năng đang được phát triển</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="moon" />
          <div className="arch">
            <span>
              như
              <br />
              <em>nguyệt</em>
            </span>
          </div>
          <div className="petal petal-one" />
          <div className="petal petal-two" />
          <span className="art-caption">CHĂM SÓC · CÂN BẰNG · THƯ THÁI</span>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CÙNG MỘT NỀN TẢNG</p>
            <h2>Không gian của bạn</h2>
          </div>
          <span className="badge">Bản xem trước</span>
        </div>
        <div className="workspace-cards">
          {[
            [
              '01',
              'Khách hàng',
              'Khám phá không gian cá nhân, lịch hẹn và liệu trình.',
              '/account',
            ],
            ['02', 'Nhân viên', 'Không gian lịch làm việc và buổi chăm sóc.', '/staff'],
            ['03', 'Quản lý', 'Không gian quản lý hoạt động của spa.', '/owner'],
          ].map(([number, title, description, path]) => (
            <Link to={path ?? '/'} className="workspace-card" key={number}>
              <span className="card-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span>
                Xem giao diện <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="system-section">
        <div>
          <h2>Kết nối hệ thống</h2>
          <p>Kiểm tra API nền tảng, không sử dụng dữ liệu nghiệp vụ.</p>
        </div>
        <SystemStatus />
      </section>
    </>
  );
}
