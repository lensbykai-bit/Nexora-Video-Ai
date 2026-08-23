module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'Nexora Video AI',
    version: '1.1.0',
    timestamp: new Date().toISOString()
  });
};
