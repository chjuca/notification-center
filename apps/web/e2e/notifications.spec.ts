import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";
const TOKEN_KEY = "notification-center.token";

const form = (page: Page) => page.locator("form:visible");
const items = (page: Page) => page.locator(".list-group-item:visible");
const errors = (page: Page) => page.locator(".alert-danger:visible");

async function fillCredentials(page: Page, email: string) {
  await form(page).getByLabel("Email").fill(email);
  await form(page).getByLabel("Contraseña").fill(PASSWORD);
}

async function fillNotification(
  page: Page,
  values: {
    title?: string;
    content?: string;
    channel?: string;
    recipient?: string;
  },
) {
  if (values.title !== undefined) {
    await form(page).getByLabel("Título").fill(values.title);
  }
  if (values.content !== undefined) {
    await form(page).getByLabel("Contenido").fill(values.content);
  }
  if (values.channel !== undefined) {
    await form(page).getByLabel("Canal").selectOption(values.channel);
  }
  if (values.recipient !== undefined) {
    await form(page).getByLabel("Destinatario").fill(values.recipient);
  }
}

test("a visitor signs up and manages their notifications", async ({ page }) => {
  const email = `browser-e2e-${Date.now()}@example.com`;

  await test.step("the home page sends anonymous visitors to the login", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  await test.step("a wrong login shows the error of the api", async () => {
    await fillCredentials(page, email);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(errors(page)).toHaveText("Invalid credentials");
  });

  await test.step("signing up logs the visitor in", async () => {
    await page.getByRole("link", { name: "Regístrate" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await fillCredentials(page, email);
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Mis notificaciones" }),
    ).toBeVisible();
  });

  await test.step("the channels come from the api", async () => {
    await expect(form(page).getByLabel("Canal").locator("option")).toHaveText([
      "email",
      "sms",
      "push",
    ]);
  });

  await test.step("an email notification is created and shown as sent", async () => {
    await fillNotification(page, {
      title: "Bienvenida",
      content: "Hola, gracias por registrarte",
      recipient: "ana@example.com",
    });
    await page.getByRole("button", { name: "Crear y enviar" }).click();

    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText("Enviada");
    await expect(form(page).getByLabel("Título")).toHaveValue("");
  });

  await test.step("a recipient the channel rejects shows why and creates nothing", async () => {
    await fillNotification(page, {
      title: "Código",
      content: "Tu código es 1234",
      channel: "sms",
      recipient: "ana@example.com",
    });
    await page.getByRole("button", { name: "Crear y enviar" }).click();

    await expect(errors(page)).toContainText("phone number");
    await expect(items(page)).toHaveCount(1);
  });

  await test.step("a long sms is sent cut to 160 characters", async () => {
    await fillNotification(page, {
      content: "x".repeat(300),
      recipient: "+56912345678",
    });
    await page.getByRole("button", { name: "Crear y enviar" }).click();

    await expect(items(page)).toHaveCount(2);
    await expect(items(page).first()).toContainText("Código");
    await items(page).first().locator("summary").click();
    await expect(items(page).first().locator("pre")).toContainText(
      '"truncated": true',
    );

    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });

  await test.step("editing changes the notification without creating another", async () => {
    await items(page).nth(1).getByRole("button", { name: "Editar" }).click();
    await expect(
      page.getByRole("heading", { name: "Editar notificación" }),
    ).toBeVisible();
    await expect(form(page).getByLabel("Título")).toHaveValue("Bienvenida");

    await fillNotification(page, { title: "Bienvenida corregida" });
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(items(page).nth(1)).toContainText("Bienvenida corregida");
    await expect(items(page)).toHaveCount(2);
  });

  await test.step("the list is paginated", async () => {
    for (const title of ["Extra 1", "Extra 2", "Extra 3", "Extra 4"]) {
      await fillNotification(page, {
        title,
        content: "contenido",
        channel: "email",
        recipient: "ana@example.com",
      });
      await page.getByRole("button", { name: "Crear y enviar" }).click();
      await expect(items(page).first()).toContainText(title);
    }
    await expect(page.getByText("Página 1 de 2 (6 en total)")).toBeVisible();

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(items(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Anterior" }).click();
    await expect(items(page)).toHaveCount(5);
  });

  await test.step("deleting asks for confirmation and removes it", async () => {
    page.once("dialog", (dialog) => dialog.accept());
    await items(page).first().getByRole("button", { name: "Eliminar" }).click();

    await expect(page.getByText("(5 en total)")).toBeVisible();
    await expect(page.getByText("Extra 4")).toHaveCount(0);
  });

  await test.step("the session survives a reload", async () => {
    await page.reload();
    await expect(page.getByText("(5 en total)")).toBeVisible();
  });

  await test.step("logging out protects the home page and clears the form", async () => {
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(form(page).getByLabel("Contraseña")).toHaveValue("");
  });

  await test.step("logging in again shows the same notifications", async () => {
    await fillCredentials(page, email);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("(5 en total)")).toBeVisible();
  });

  await test.step("an invalid or expired token ends the session", async () => {
    await page.evaluate(
      (key) => window.localStorage.setItem(key, "not-a-valid-token"),
      TOKEN_KEY,
    );
    await page.reload();

    await expect(page).toHaveURL(/\/login$/);
    expect(
      await page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY),
    ).toBeNull();
  });
});
