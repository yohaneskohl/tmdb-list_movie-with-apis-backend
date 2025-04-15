const passport = require("passport");
const { PrismaClient } = require("@prisma/client");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const prisma = new PrismaClient();
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL } = process.env;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:GOOGLE_REDIRECT_URL,

      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("No email found in profile"), null);
        }

        const email = profile.emails[0].value;

        let user = await prisma.user.upsert({
          where: { email },
          update: { googleid: profile.id },
          create: {
            name: profile.displayName || "",
            email,
            googleid: profile.id,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
