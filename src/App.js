import React, { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────
// ITAP BOOK STORE — connects to Spring Boot backend on port 8080
//
// What each hook does:
//   useState  → stores books, cart, and what's visible on screen
//   useEffect → (1) loads books from backend on page load
//               (2) opens a live WebSocket so stock updates
//                   instantly in every tab without refreshing
// ─────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8080/books";
const WS_URL   = "ws://localhost:8080/ws/websocket"; // Spring STOMP endpoint

function App() {

  const [books,           setBooks]           = useState([]);
  const [cart,            setCart]            = useState([]);
  const [showCart,        setShowCart]        = useState(false);
  const [wsConnected,     setWsConnected]     = useState(false);
  const [placingOrder,    setPlacingOrder]    = useState(false);
  const [orderMessage,    setOrderMessage]    = useState("");

  // ── 1. Load books from the backend when the page opens ──────────
  useEffect(() => {
    fetch(API_BASE)
      .then(res => res.json())
      .then(data => setBooks(data))
      .catch(() => console.warn("Backend not reachable — is Spring Boot running?"));
  }, []);

  // ── 2. Open a live WebSocket connection ─────────────────────────
  // Whenever anyone (any tab, any user) buys a book, the backend
  // broadcasts a message here and we update that book's stock count
  // immediately — no page refresh, no polling every few seconds.
  useEffect(() => {
    let ws;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setWsConnected(true);
        // Tell the STOMP broker we want stock-update messages
        ws.send("CONNECT\naccept-version:1.1\n\n\0");
        ws.send("SUBSCRIBE\nid:sub-0\ndestination:/topic/stock-updates\n\n\0");
      };

      ws.onclose  = () => { setWsConnected(false); setTimeout(connect, 3000); };
      ws.onerror  = () => setWsConnected(false);

      ws.onmessage = (event) => {
        // STOMP frames start with MESSAGE\n... — extract the JSON body
        const raw = event.data;
        if (!raw.startsWith("MESSAGE")) return;
        const bodyStart = raw.indexOf("\n\n") + 2;
        const bodyEnd   = raw.lastIndexOf("\0");
        try {
          const update = JSON.parse(raw.slice(bodyStart, bodyEnd)); // { id, stock, title }

          // Update that book's stock in the list
          setBooks(prev =>
            prev.map(b => b.id === update.id ? { ...b, stock: update.stock } : b)
          );

          // If the stock dropped below what's in someone's cart, trim it down
          setCart(prev =>
            prev
              .map(item =>
                item.id === update.id
                  ? { ...item, quantity: Math.min(item.quantity, update.stock) }
                  : item
              )
              .filter(item => item.quantity > 0)
          );
        } catch (_) {}
      };
    }

    connect();
    return () => ws && ws.close();
  }, []);

  // ── Cart helpers ─────────────────────────────────────────────────

  const addToCart = (book) => {
    if (book.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === book.id);
      if (existing) {
        return existing.quantity < book.stock
          ? prev.map(i => i.id === book.id ? { ...i, quantity: i.quantity + 1 } : i)
          : prev;
      }
      return [...prev, { ...book, quantity: 1 }];
    });
    setShowCart(true);
  };

  const increaseQty = (id) => {
    const book = books.find(b => b.id === id);
    setCart(prev => prev.map(i =>
      i.id === id && (!book || i.quantity < book.stock)
        ? { ...i, quantity: i.quantity + 1 }
        : i
    ));
  };

  const decreaseQty = (id) => {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
          .filter(i => i.quantity > 0)
    );
  };

  const removeItem  = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const getQty      = (id) => cart.find(i => i.id === id)?.quantity ?? 0;

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax        = subtotal * 0.08;
  const grandTotal = subtotal + tax;

  // ── Place order — actually calls the backend ─────────────────────
  const placeOrder = async () => {
    setPlacingOrder(true);
    setOrderMessage("");
    const failures = [];

    for (const item of cart) {
      try {
        const res  = await fetch(`${API_BASE}/${item.id}/buy`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ quantity: item.quantity }),
        });
        const data = await res.json();
        if (!res.ok) {
          failures.push(`${item.title} — ${data.error}`);
        } else {
          // Update stock locally right away (WebSocket will also arrive)
          setBooks(prev => prev.map(b => b.id === item.id ? { ...b, stock: data.stock } : b));
          setCart(prev  => prev.filter(c => c.id !== item.id));
        }
      } catch {
        failures.push(`${item.title} — could not reach the server`);
      }
    }

    setPlacingOrder(false);
    setOrderMessage(
      failures.length === 0
        ? "✅ Order placed! Thanks for shopping with us."
        : `⚠️ Some items couldn't be ordered:\n${failures.join("\n")}`
    );
  };

  // ── UI ────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: "#f1f3f6", minHeight: "100vh", fontFamily: "Arial" }}>

      {/* ── Header ── */}
      <div style={{
        backgroundColor: "#2874f0", color: "white", padding: "15px 30px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 1000,
      }}>
        <h1 style={{ margin: 0 }}>📚 BOOK STORE</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* Live connection badge */}
          <span style={{
            backgroundColor: wsConnected ? "#1f9d55" : "#888",
            color: "white", padding: "6px 12px", borderRadius: "4px",
            fontSize: "13px", fontWeight: "bold",
          }}>
            {wsConnected ? "🟢 Live" : "⚪ Connecting…"}
          </span>

          <button
            onClick={() => setShowCart(!showCart)}
            style={{
              backgroundColor: "white", color: "#2874f0", border: "none",
              padding: "12px 20px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer",
            }}
          >
            {showCart ? "Hide Cart" : "🛒 View Cart"} ({totalItems})
          </button>
        </div>
      </div>

      <div style={{ padding: "30px" }}>
        <h2>Available Books</h2>

        {books.length === 0 && (
          <p style={{ color: "#888" }}>Loading books from the server…</p>
        )}

        {/* ── Book grid ── */}
        <div style={{ display: "flex", gap: "25px", flexWrap: "wrap" }}>
          {books.map(book => {
            const outOfStock = book.stock <= 0;
            const qty        = getQty(book.id);
            return (
              <div key={book.id} style={{
                backgroundColor: "white", width: "260px", padding: "18px",
                borderRadius: "8px", textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}>
                <img src={book.image} alt={book.title}
                  style={{ width: "160px", height: "230px", objectFit: "cover" }} />

                <h3 style={{ margin: "10px 0 4px" }}>{book.title}</h3>
                <p style={{ color: "#666", margin: "0 0 6px", fontSize: "13px" }}>{book.author}</p>
                <h2 style={{ color: "black", margin: "0 0 8px" }}>${book.price.toFixed(2)}</h2>

                {/* Stock label — colour changes based on how many are left */}
                <p style={{
                  fontSize: "13px", fontWeight: "bold", margin: "0 0 10px",
                  color: outOfStock ? "#cc0000" : book.stock <= 3 ? "#cc7a00" : "#1f9d55",
                }}>
                  {outOfStock ? "Out of stock" : `${book.stock} in stock`}
                </p>

                {/* Add to cart / +/- stepper */}
                {outOfStock ? (
                  <button disabled style={{
                    backgroundColor: "#bbb", color: "white", border: "none",
                    padding: "12px 30px", borderRadius: "4px", fontWeight: "bold",
                    cursor: "not-allowed",
                  }}>Out of Stock</button>
                ) : qty === 0 ? (
                  <button onClick={() => addToCart(book)} style={{
                    backgroundColor: "#ff9f00", color: "white", border: "none",
                    padding: "12px 30px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer",
                  }}>Add to Cart</button>
                ) : (
                  <div style={{
                    backgroundColor: "#ff9f00", color: "white", borderRadius: "4px",
                    width: "140px", margin: "auto", padding: "8px",
                    display: "flex", justifyContent: "space-around", fontWeight: "bold",
                  }}>
                    <button onClick={() => decreaseQty(book.id)}>−</button>
                    <span>{qty}</span>
                    <button
                      onClick={() => increaseQty(book.id)}
                      disabled={qty >= book.stock}
                      style={{ opacity: qty >= book.stock ? 0.5 : 1 }}
                    >+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Cart panel ── */}
        {showCart && (
          <div style={{ display: "flex", gap: "25px", marginTop: "35px", alignItems: "flex-start" }}>

            {/* Cart items */}
            <div style={{
              backgroundColor: "white", padding: "25px", borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flex: 1,
            }}>
              <h1>🛒 My Cart ({totalItems} items)</h1>

              {cart.length === 0 ? <p>Your cart is empty.</p> : cart.map(item => (
                <div key={item.id} style={{
                  display: "flex", gap: "20px", borderBottom: "1px solid #ddd",
                  padding: "20px 0", alignItems: "center",
                }}>
                  <img src={item.image} alt={item.title}
                    style={{ width: "90px", height: "120px", objectFit: "cover" }} />

                  <div style={{ flex: 1 }}>
                    <h3>{item.title}</h3>
                    <p>Price: ${item.price.toFixed(2)}</p>
                    <button onClick={() => decreaseQty(item.id)}>−</button>
                    <span style={{ margin: "0 10px" }}>{item.quantity}</span>
                    <button onClick={() => increaseQty(item.id)}>+</button>
                    <button onClick={() => removeItem(item.id)} style={{
                      marginLeft: "15px", color: "white", backgroundColor: "red",
                      border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer",
                    }}>Remove</button>
                  </div>

                  <h3>${(item.price * item.quantity).toFixed(2)}</h3>
                </div>
              ))}
            </div>

            {/* Price summary */}
            {cart.length > 0 && (
              <div style={{
                backgroundColor: "white", padding: "20px", borderRadius: "8px",
                width: "350px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}>
                <h2>Price Details</h2>
                <p>Total Items: {totalItems}</p>
                <p>Subtotal: ${subtotal.toFixed(2)}</p>
                <p>Tax (8%): ${tax.toFixed(2)}</p>
                <hr />
                <h2>Grand Total: ${grandTotal.toFixed(2)}</h2>

                <button onClick={placeOrder} disabled={placingOrder} style={{
                  backgroundColor: "#fb641b", color: "white", border: "none",
                  padding: "12px", width: "100%", borderRadius: "4px",
                  fontWeight: "bold", cursor: placingOrder ? "not-allowed" : "pointer",
                  opacity: placingOrder ? 0.7 : 1,
                }}>
                  {placingOrder ? "Placing order…" : "Place Order"}
                </button>

                {orderMessage && (
                  <p style={{ marginTop: "12px", fontSize: "13px", whiteSpace: "pre-line" }}>
                    {orderMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
