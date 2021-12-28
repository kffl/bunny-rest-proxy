import buildApp from './server';

async function start() {
    const app = buildApp();
    try {
        await app.listen(3000);
    } catch (err) {
        app.log.error('An error occurred when starting BRP server: ' + err);
        process.exit(1);
    }
}

start();
