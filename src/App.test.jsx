import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

// Mock WebSocket before ANY test runs — must be before imports take effect
beforeAll(() => {
  global.WebSocket = function() {
    this.send    = () => {};
    this.close   = () => {};
    this.onopen  = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
  };
});

const sampleBook = {
  id: 1, title: "Java for Beginners", author: "Herbert Schildt",
  price: 14.99, stock: 3, image: "https://via.placeholder.com/160x230",
};

function mockFetch(data) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
  );
}

afterEach(() => jest.resetAllMocks());

test("shows books returned by the backend", async () => {
  mockFetch([sampleBook]);
  render(<App />);
  expect(await screen.findByText("Java for Beginners")).toBeInTheDocument();
  expect(screen.getByText("3 in stock")).toBeInTheDocument();
});

test("Add to Cart updates the cart count", async () => {
  mockFetch([sampleBook]);
  render(<App />);
  await screen.findByText("Java for Beginners");
  fireEvent.click(screen.getByText("Add to Cart"));
  await waitFor(() => {
    const btn = screen.getByRole("button", { name: /cart/i });
    expect(btn.textContent).toContain("1");
  });
});

test("+ button disabled at max stock", async () => {
  mockFetch([{ ...sampleBook, stock: 1 }]);
  render(<App />);
  await screen.findByText("Java for Beginners");
  fireEvent.click(screen.getByText("Add to Cart"));
  await waitFor(() => {
    const plusBtns = screen.getAllByText("+");
    expect(plusBtns.some(b => b.disabled)).toBe(true);
  });
});

test("shows Out of Stock button when stock is 0", async () => {
  mockFetch([{ ...sampleBook, stock: 0 }]);
  render(<App />);
  await screen.findByText("Java for Beginners");
  const btn = await screen.findByRole("button", { name: "Out of Stock" });
  expect(btn).toBeDisabled();
});
