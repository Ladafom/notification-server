require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

webpush.setVapidDetails(
  'mailto:example.com',
  'BN7CbYBCrB_v82JEJiWV27C0_QsDtQZdGy9HTIlvnsT9Q_Ekg5BAqgKR0lOgvnfosTrCsJ2uqV3AmaonDRrLMMQ',
  'ARkwMbccTrBpgy0f6wn2ZrI1SEuqQ8IldzBPMawMhEQ'
);

let subscriptions = [];

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  
  if (!subscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
    subscriptions.push(subscription);
    console.log('Новая подписка:', subscription.endpoint);
  }
  
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/notify-all', (req, res) => {
  const { title, body, icon, url } = req.body;

  const payload = JSON.stringify({
    title,
    body,
    icon,
    url: url || '/'
  });

  const notificationPromises = subscriptions.map(sub => 
    webpush.sendNotification(sub, payload)
      .catch(err => {
        console.error('Ошибка отправки:', err);
        if (err.statusCode === 410) {
          subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
        }
      })
  );

  Promise.all(notificationPromises)
    .then(() => res.json({ message: `Уведомления отправлены ${subscriptions.length} подписчикам` }))
    .catch(err => {
      console.error('Ошибка:', err);
      res.status(500).json({ error: 'Ошибка отправки уведомлений' });
    });
});

app.get('/send-test', (req, res) => {
  const payload = JSON.stringify({
    title: 'Тестовое уведомление',
    body: 'Сервер работает корректно!',
    icon: '/icon-192x192.png',
    url: '/'
  });

  if (subscriptions.length === 0) {
    return res.status(400).json({ error: 'Нет активных подписчиков' });
  }

  webpush.sendNotification(subscriptions[0], payload)
    .then(() => res.json({ message: 'Тестовое уведомление отправлено' }))
    .catch(err => {
      console.error('Ошибка:', err);
      res.status(500).json({ error: 'Ошибка отправки' });
    });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});