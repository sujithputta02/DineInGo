const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb+srv://admin:admin123@cluster0.abcde.mongodb.net/test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).catch(e => console.error("Could not connect to test, trying dev...", e));

    // We actually need the correct Mongo URI from the backend codebase. Let me read the .env file instead.
}
check();
