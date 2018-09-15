module.exports = function (page) {
    if (process.env.NODE_ENV === 'production') {
        return `file://${__dirname}/pages/` + page + '.html';
    } else {
        return `http://localhost:3000/` + page + '.html'
    }
}