// Estilos de "Mi dinero" (compartidos por ayudante, encargado y secretaría).
export const MONEY_STYLES = `
      :host {
        --finance-bg: var(--t-surface-2);
        --finance-white: var(--t-surface);
        --finance-primary: var(--t-primary);
        --finance-primary-dark: var(--t-text);
        --finance-primary-light: var(--t-primary-soft);
        --finance-text: var(--t-text);
        --finance-text-soft: var(--t-muted);
        --finance-muted: var(--t-muted);
        --finance-border: var(--t-border);
        --finance-orange: var(--t-warning);
        --finance-orange-bg: var(--t-warning-soft);
        --finance-green: var(--t-success);
        --finance-green-bg: var(--t-success-soft);
        --finance-shadow: 0 8px 30px rgba(24, 47, 83, 0.06);
        --finance-shadow-soft: 0 4px 18px rgba(24, 47, 83, 0.05);

        display: block;
        min-height: 100%;
        background: var(--finance-bg);
      }

      /* =========================================================
         HEADER
      ========================================================= */

      .finance-header {
        --background: var(--t-surface);
        background: var(--t-surface);
      }

      .finance-header ion-toolbar {
        --background: var(--t-surface);
        --border-width: 0;
        --min-height: 64px;

        height: 64px;
        padding: 0 12px;
      }

      .finance-header ion-title {
        color: var(--finance-primary-dark);
        font-size: 25px;
        font-weight: 800;
        text-align: center;
        letter-spacing: -0.5px;
      }

      /* =========================================================
         CONTENT
      ========================================================= */

      .fin-content {
        --background: var(--finance-bg);
      }

      .fin-wrap {
        width: 100%;
        max-width: 900px;

        margin: 0 auto;

        padding: 20px 16px 140px;

        box-sizing: border-box;
      }

      /* =========================================================
         HERO
      ========================================================= */

      .hero-card {
        position: relative;

        display: flex;
        flex-direction: column;
        align-items: center;

        text-align: center;

        min-height: 330px;

        padding: 32px 20px 38px;

        margin-bottom: 22px;

        background: var(--t-surface);

        border: 1px solid var(--t-border);

        border-radius: 24px;

        overflow: hidden;

        box-shadow: var(--t-shadow);
      }

      .hero-top-line {
        position: absolute;

        top: 0;
        left: 0;
        right: 0;

        height: 8px;

        background: linear-gradient(90deg, var(--t-primary), var(--t-text));
      }

      .hero-icon-wrapper {
        width: 90px;
        height: 90px;

        display: flex;
        align-items: center;
        justify-content: center;

        margin-top: 5px;
        margin-bottom: 16px;

        border-radius: 50%;

        background: radial-gradient(
          circle,
          var(--t-surface) 35%,
          var(--t-primary-soft) 36%,
          var(--t-primary-soft) 100%
        );
      }

      .hero-icon-circle {
        width: 54px;
        height: 54px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 16px;

        background: var(--t-surface);

        box-shadow: 0 5px 18px rgba(23, 105, 255, 0.16);
      }

      .hero-icon-circle ion-icon {
        font-size: 31px;
        color: var(--finance-primary);
      }

      .hero-label {
        color: var(--finance-primary);

        font-size: 0.72rem;

        font-weight: 800;

        letter-spacing: 0.22em;

        text-transform: uppercase;
      }

      .hero-value {
        display: flex;
        align-items: baseline;

        margin-top: 9px;

        color: var(--finance-primary-dark);

        font-size: 4.1rem;

        line-height: 1;

        font-weight: 800;

        letter-spacing: -2px;

        font-variant-numeric: tabular-nums;
      }

      .hero-value small {
        margin-left: 7px;

        font-size: 1.35rem;

        font-weight: 500;

        color: var(--finance-text-soft);

        letter-spacing: 0;
      }

      .hero-rule {
        width: 70px;
        height: 3px;

        margin: 20px 0 15px;

        border-radius: 10px;

        background: var(--finance-primary);
      }

      .hero-sub {
        color: var(--finance-text-soft);

        font-size: 0.9rem;

        font-weight: 500;
      }

      .hero-wave {
        position: absolute;

        bottom: -80px;
        left: -5%;

        width: 110%;
        height: 130px;

        border-radius: 50% 50% 0 0;

        background: rgba(23, 105, 255, 0.055);

        transform: rotate(-2deg);
      }

      /* =========================================================
         ESTADÍSTICAS
      ========================================================= */

      .stat-row {
        display: grid;

        grid-template-columns: repeat(3, minmax(0, 1fr));

        gap: 12px;

        margin-bottom: 22px;
      }

      .stat-card {
        position: relative;

        min-height: 150px;

        display: flex;

        flex-direction: column;

        align-items: center;

        justify-content: center;

        text-align: center;

        padding: 16px 8px;

        background: var(--t-surface);

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);

        overflow: hidden;
      }

      .stat-icon {
        width: 52px;
        height: 52px;

        display: flex;
        align-items: center;
        justify-content: center;

        margin-bottom: 10px;

        border-radius: 50%;
      }

      .stat-icon ion-icon {
        font-size: 27px;
      }

      .stat-info {
        display: flex;

        flex-direction: column;

        align-items: center;

        gap: 5px;
      }

      .stat-label {
        color: var(--finance-text-soft);

        font-size: 0.66rem;

        font-weight: 800;

        letter-spacing: 0.12em;

        text-transform: uppercase;
      }

      .stat-value {
        font-size: 1.18rem;

        font-weight: 800;

        line-height: 1.1;

        font-variant-numeric: tabular-nums;
      }

      .stat-value small {
        font-size: 0.85rem;
        font-weight: 600;
      }

      /* =========================================================
         PENDIENTE
      ========================================================= */

      .stat-card.pendiente {
        background: var(--t-surface);
      }

      .stat-card.pendiente .stat-icon {
        background: var(--finance-orange-bg);
      }

      .stat-card.pendiente .stat-icon ion-icon {
        color: var(--finance-orange);
      }

      .stat-card.pendiente .stat-value {
        color: var(--finance-orange);
      }

      /* =========================================================
         PAGADO
      ========================================================= */

      .stat-card.pagado {
        background: var(--t-surface);
      }

      .stat-card.pagado .stat-icon {
        background: var(--finance-green-bg);
      }

      .stat-card.pagado .stat-icon ion-icon {
        color: var(--finance-green);
      }

      .stat-card.pagado .stat-value {
        color: var(--finance-green);
      }

      /* =========================================================
         TRABAJOS
      ========================================================= */

      .stat-card.trabajos {
        background: var(--t-surface);
      }

      .stat-card.trabajos .stat-icon {
        background: var(--finance-primary-light);
      }

      .stat-card.trabajos .stat-icon ion-icon {
        color: var(--finance-primary);
      }

      .stat-card.trabajos .stat-value {
        color: var(--finance-primary);
      }

      /* =========================================================
         DECORACIÓN
      ========================================================= */

      .stat-decoration {
        position: absolute;

        bottom: 8px;
        left: 50%;

        transform: translateX(-50%);

        width: 42px;
        height: 3px;

        border-radius: 10px;

        opacity: 0.35;
      }

      .pendiente .stat-decoration {
        background: var(--finance-orange);
      }

      .pagado .stat-decoration {
        background: var(--finance-green);
      }

      .trabajos .stat-decoration {
        background: var(--finance-primary);
      }

      /* =========================================================
         SELECTOR MES
      ========================================================= */

      .month-selector {
        position: relative;

        display: flex;

        align-items: center;

        justify-content: space-between;

        width: 100%;

        min-height: 74px;

        padding: 10px;

        margin-bottom: 22px;

        box-sizing: border-box;

        background: var(--t-surface);

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);

        overflow: hidden;
      }

      .month-selector::before {
        content: "";

        position: absolute;

        top: 0;
        left: 0;
        right: 0;

        height: 4px;

        display: none;
      }

      .month-arrow {
        width: 44px;
        height: 44px;

        flex: 0 0 44px;

        display: flex;

        align-items: center;

        justify-content: center;

        padding: 0;

        border: 1px solid var(--finance-border);

        border-radius: 14px;

        background: var(--t-surface);

        color: var(--finance-primary);

        cursor: pointer;

        transition: transform 0.15s ease,
          background 0.15s ease;
      }

      .month-arrow:hover {
        background: var(--finance-primary-light);
      }

      .month-arrow:active {
        transform: scale(0.94);
      }

      .month-arrow ion-icon {
        font-size: 22px;
      }

      .month-current {
        display: flex;

        align-items: center;

        justify-content: center;

        gap: 10px;

        min-width: 0;

        text-align: center;
      }

      .month-icon {
        width: 42px;
        height: 42px;

        flex: 0 0 42px;

        display: flex;

        align-items: center;

        justify-content: center;

        border-radius: 13px;

        background: var(--finance-primary-light);

        color: var(--finance-primary);
      }

      .month-icon ion-icon {
        font-size: 21px;
      }

      .month-info {
        min-width: 0;

        text-align: left;
      }

      .month-info span {
        display: block;

        margin-bottom: 2px;

        color: var(--finance-muted);

        font-size: 9px;

        font-weight: 800;

        letter-spacing: 0.9px;
      }

      .month-info strong {
        display: block;

        color: var(--finance-primary-dark);

        font-size: 18px;

        font-weight: 800;

        text-transform: capitalize;

        white-space: nowrap;
      }

      /* =========================================================
         ACTIVIDAD
      ========================================================= */

      .activity-section {
        width: 100%;
      }

      .section-header {
        display: flex;

        align-items: center;

        justify-content: space-between;

        gap: 12px;

        margin: 0 2px 14px;
      }

      .section-title-wrapper {
        display: flex;

        align-items: center;

        gap: 10px;

        min-width: 0;
      }

      .section-icon {
        width: 40px;
        height: 40px;

        flex: 0 0 40px;

        display: flex;

        align-items: center;

        justify-content: center;

        border-radius: 12px;

        background: var(--finance-primary);

        box-shadow: 0 5px 14px rgba(23, 105, 255, 0.2);
      }

      .section-icon ion-icon {
        color: #ffffff;

        font-size: 21px;
      }

      .section-title-text {
        min-width: 0;
      }

      .section-title-text h3 {
        margin: 0;

        color: var(--finance-text);

        font-size: 0.86rem;

        font-weight: 800;

        letter-spacing: 0.04em;

        line-height: 1.25;
      }

      .section-title-text span {
        display: block;

        margin-top: 3px;

        color: var(--finance-text-soft);

        font-size: 0.72rem;
      }

      /* =========================================================
         SCROLL INTERNO
      ========================================================= */

      .ledger-scroll {
        width: 100%;

        max-height: 520px;

        overflow-y: auto;

        overflow-x: hidden;

        padding-right: 4px;

        box-sizing: border-box;

        overscroll-behavior: contain;

        -webkit-overflow-scrolling: touch;

        scrollbar-width: thin;

        scrollbar-color: var(--t-border) transparent;
      }

      .ledger-scroll::-webkit-scrollbar {
        width: 6px;
      }

      .ledger-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .ledger-scroll::-webkit-scrollbar-thumb {
        background: var(--t-border);

        border-radius: 10px;
      }

      /* =========================================================
         LEDGER
      ========================================================= */

      .ledger {
        overflow: hidden;

        background: var(--t-surface);

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);
      }

      .ledger-row {
        display: flex;

        align-items: center;

        gap: 12px;

        min-height: 92px;

        padding: 13px 15px;

        box-sizing: border-box;

        border-bottom: 1px solid var(--t-surface-2);
      }

      .ledger-row:last-child {
        border-bottom: none;
      }

      /* =========================================================
         ICONOS
      ========================================================= */

      .activity-icon {
        width: 46px;
        height: 46px;

        flex: 0 0 46px;

        display: flex;

        align-items: center;

        justify-content: center;

        border-radius: 14px;
      }

      .activity-icon ion-icon {
        font-size: 22px;
      }

      .activity-icon.income {
        background: var(--finance-green-bg);

        color: var(--finance-green);
      }

      .activity-icon.payment {
        background: var(--finance-orange-bg);

        color: var(--finance-orange);
      }

      /* =========================================================
         INFORMACIÓN
      ========================================================= */

      .ledger-main {
        display: flex;

        flex-direction: column;

        flex: 1;

        min-width: 0;
      }

      .ledger-type {
        overflow: hidden;

        color: var(--finance-text);

        font-size: 0.92rem;

        font-weight: 800;

        text-overflow: ellipsis;

        white-space: nowrap;
      }

      .ledger-description {
        display: flex;

        align-items: center;

        flex-wrap: wrap;

        gap: 9px;

        margin-top: 5px;

        color: var(--finance-text-soft);

        font-size: 0.73rem;
      }

      .data-item {
        display: inline-flex;

        align-items: center;

        gap: 4px;
      }

      .data-item ion-icon {
        font-size: 14px;

        color: var(--finance-primary);
      }

      /* =========================================================
         DURACIÓN
      ========================================================= */

      .ledger-work-duration {
        display: inline-flex;

        align-items: center;

        width: fit-content;

        margin-top: 6px;

        padding: 4px 8px;

        border-radius: 8px;

        background: var(--finance-primary-light);

        color: var(--finance-primary);

        font-size: 0.7rem;

        font-weight: 800;
      }

      /* =========================================================
         PAGO
      ========================================================= */

      .payment-title {
        color: var(--finance-text);
      }

      .payment-description {
        margin-top: 5px;

        color: var(--finance-orange);

        font-size: 0.68rem;

        font-weight: 600;
      }

      /* =========================================================
         DINERO
      ========================================================= */

      .ledger-right {
        display: flex;

        align-items: center;

        gap: 7px;

        margin-left: 5px;
      }

      .ledger-amount {
        font-size: 0.94rem;

        font-weight: 800;

        white-space: nowrap;

        font-variant-numeric: tabular-nums;
      }

      .ledger-amount.income {
        color: var(--finance-green);
      }

      .ledger-amount.payment-amount {
        color: var(--finance-orange);
      }

      /* =========================================================
         EMPTY
      ========================================================= */

      .empty-state {
        display: flex;

        flex-direction: column;

        align-items: center;

        justify-content: center;

        min-height: 280px;

        padding: 35px 20px;

        text-align: center;

        background: var(--t-surface);

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);
      }

      .empty-icon-wrapper {
        width: 110px;
        height: 110px;

        display: flex;

        align-items: center;

        justify-content: center;

        margin-bottom: 16px;

        border-radius: 50%;

        border: 1px dashed var(--t-border);

        background: var(--t-surface-2);
      }

      .empty-icon {
        width: 70px;
        height: 70px;

        display: flex;

        align-items: center;

        justify-content: center;

        border-radius: 20px;

        background: var(--finance-primary-light);
      }

      .empty-icon ion-icon {
        font-size: 38px;

        color: var(--finance-primary);
      }

      .empty-state h4 {
        margin: 0 0 8px;

        color: var(--finance-text);

        font-size: 1rem;

        font-weight: 800;
      }

      .empty-state p {
        max-width: 300px;

        margin: 0;

        color: var(--finance-text-soft);

        font-size: 0.84rem;

        line-height: 1.5;
      }

      /* =========================================================
         TABBAR
      ========================================================= */

      .employee-tabbar-container {
        position: fixed;

        left: 0;
        right: 0;
        bottom: 0;

        z-index: 10000;

        width: 100%;

        background: var(--t-surface);

        border-top: 1px solid var(--finance-border);

        box-shadow: 0 -6px 20px rgba(24, 47, 83, 0.08);

        padding-bottom: env(safe-area-inset-bottom);

        display: block;
      }

      /* =========================================================
         TABLET
      ========================================================= */

      @media (max-width: 700px) {
        .stat-row {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      /* =========================================================
         MÓVIL
      ========================================================= */

      @media (max-width: 500px) {
        .fin-wrap {
          padding-left: 14px;
          padding-right: 14px;
        }

        .hero-card {
          min-height: 300px;

          padding: 28px 16px 34px;
        }

        .hero-value {
          font-size: 3.4rem;
        }

        .stat-card {
          min-height: 135px;

          padding: 12px 5px;
        }

        .stat-icon {
          width: 46px;
          height: 46px;
        }

        .stat-icon ion-icon {
          font-size: 24px;
        }

        .stat-label {
          font-size: 0.56rem;
        }

        .stat-value {
          font-size: 0.98rem;
        }

        .section-title-text h3 {
          font-size: 0.75rem;
        }

        .section-title-text span {
          font-size: 0.65rem;
        }

        .ledger-scroll {
          max-height: 58vh;
        }

        .ledger-row {
          gap: 9px;

          padding: 11px 10px;
        }

        .activity-icon {
          width: 40px;
          height: 40px;

          flex-basis: 40px;
        }

        .activity-icon ion-icon {
          font-size: 20px;
        }

        .ledger-type {
          font-size: 0.82rem;
        }

        .ledger-description {
          gap: 6px;

          font-size: 0.68rem;
        }

        .ledger-work-duration {
          font-size: 0.65rem;

          padding: 4px 7px;
        }

        .ledger-amount {
          font-size: 0.78rem;
        }

        .month-info strong {
          font-size: 16px;
        }
      }

      /* =========================================================
         MÓVIL PEQUEÑO
      ========================================================= */

      @media (max-width: 380px) {
        .fin-wrap {
          padding-left: 12px;
          padding-right: 12px;
        }

        .hero-value {
          font-size: 3rem;
        }

        .stat-card {
          min-height: 125px;

          padding-left: 3px;
          padding-right: 3px;
        }

        .stat-icon {
          width: 42px;
          height: 42px;
        }

        .stat-icon ion-icon {
          font-size: 22px;
        }

        .stat-label {
          font-size: 0.51rem;
        }

        .stat-value {
          font-size: 0.9rem;
        }

        .month-arrow {
          width: 40px;
          height: 40px;

          flex-basis: 40px;
        }

        .month-icon {
          width: 38px;
          height: 38px;

          flex-basis: 38px;
        }

        .month-info strong {
          font-size: 15px;
        }

        .ledger-row {
          min-height: 88px;
        }

        .ledger-description {
          flex-direction: column;

          align-items: flex-start;

          gap: 2px;
        }

        .ledger-right {
          margin-left: 2px;
        }
      }

      /* =========================================================
         ESCRITORIO
      ========================================================= */

      @media (min-width: 768px) {
        .fin-wrap {
          padding: 30px 30px 140px;
        }

        .hero-card {
          min-height: 360px;
        }

        .hero-value {
          font-size: 5rem;
        }

        .stat-card {
          min-height: 165px;
        }

        .ledger-scroll {
          max-height: 600px;
        }

        .ledger-row {
          padding-left: 20px;
          padding-right: 20px;
        }
      }
`;
