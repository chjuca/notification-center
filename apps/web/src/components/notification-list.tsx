import type { Delivery, Notification } from "@/lib/notifications";

interface NotificationListProps {
  notifications: Notification[];
  onEdit: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
}

function DeliveryStatus({ delivery }: { delivery: Delivery }) {
  const sent = delivery.status === "sent";

  return (
    <details>
      <summary>
        <span className={`badge ${sent ? "text-bg-success" : "text-bg-danger"}`}>
          {sent ? "Enviada" : "Falló"}
        </span>{" "}
        <small className="text-muted">
          {new Date(delivery.createdAt).toLocaleString()}
        </small>
      </summary>
      {delivery.error && <p className="text-danger mb-1">{delivery.error}</p>}
      <pre className="small bg-light p-2 mb-0">
        {JSON.stringify(delivery.details, null, 2)}
      </pre>
    </details>
  );
}

export function NotificationList({
  notifications,
  onEdit,
  onDelete,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return <p className="text-muted">Todavía no tienes notificaciones.</p>;
  }

  return (
    <ul className="list-group mb-3">
      {notifications.map((notification) => (
        <li key={notification.id} className="list-group-item text-break">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <strong>{notification.title}</strong>{" "}
              <span className="badge text-bg-secondary">
                {notification.channel}
              </span>
              <div className="text-muted small">{notification.recipient}</div>
            </div>
            <div className="text-nowrap">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary me-2"
                onClick={() => onEdit(notification)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onDelete(notification)}
              >
                Eliminar
              </button>
            </div>
          </div>

          <p className="my-2" style={{ whiteSpace: "pre-wrap" }}>
            {notification.content}
          </p>

          {notification.deliveries.map((delivery) => (
            <DeliveryStatus key={delivery.id} delivery={delivery} />
          ))}
        </li>
      ))}
    </ul>
  );
}
