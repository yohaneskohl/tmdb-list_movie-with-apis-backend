require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const cors = require("cors");
const Sentry = require("@sentry/node");
const path = require("path"); 
const { SENTRY_DSN } = process.env;
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;
const server = require("http").createServer(app);
global.io = require("socket.io")(server);

// ✅ Init Sentry
Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Setup View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ Socket.io connection
global.io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// ✅ Use all routes (including "/")
app.use(routes);

app.use(Sentry.Handlers.errorHandler());

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: false,
    message: `are you lost? ${req.method} ${req.url} is not registered!`,
    data: null,
  });
});

// 500 handler
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({
    status: false,
    message: err.message,
    data: null,
  });
});

// ✅ Start server
server.listen(PORT, () => console.log("Listening on port", PORT));

module.exports = app;
