const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

// Получить все взвода сбора с количеством участников
router.get('/collections/:collectionId/platoons', (req, res) => {
  const { collectionId } = req.params;
  const sql = `
    SELECT p.id, p.name, COUNT(cp.id) as people_count
    FROM platoons p
    LEFT JOIN collection_people cp ON cp.platoon_id = p.id
    WHERE p.collection_id = ?
    GROUP BY p.id
    ORDER BY p.name
  `;
  db.all(sql, [collectionId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Создать взвод
router.post('/collections/:collectionId/platoons', (req, res) => {
  const { collectionId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Название взвода обязательно' });
  db.run('INSERT INTO platoons (collection_id, name) VALUES (?, ?)', [collectionId, name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Взвод создан' });
  });
});

// Редактировать название взвода
router.put('/platoons/:platoonId', (req, res) => {
  const { platoonId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  db.run('UPDATE platoons SET name = ? WHERE id = ?', [name, platoonId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Взвод не найден' });
    res.json({ message: 'Название обновлено' });
  });
});

// Удалить взвод (сброс platoon_id у участников)
router.delete('/platoons/:platoonId', (req, res) => {
  const { platoonId } = req.params;
  db.run('UPDATE collection_people SET platoon_id = NULL WHERE platoon_id = ?', [platoonId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM platoons WHERE id = ?', [platoonId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Взвод удалён' });
    });
  });
});

// Получить всех участников сбора с их школами и текущим взводом
router.get('/collections/:collectionId/participants', (req, res) => {
  const { collectionId } = req.params;
  const sql = `
    SELECT p.id, p.full_name, p.organization, p.platoon_id, s.edu_org as school_name
    FROM collection_people p
    JOIN collection_schools s ON p.school_id = s.id
    WHERE s.collection_id = ?
    ORDER BY p.full_name
  `;
  db.all(sql, [collectionId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Назначить участнику взвод
router.put('/people/:personId/platoon', (req, res) => {
  const { personId } = req.params;
  const { platoon_id } = req.body;
  db.run('UPDATE collection_people SET platoon_id = ? WHERE id = ?', [platoon_id || null, personId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Обновлено' });
  });
});

// Массовое добавление в взвод
router.post('/people/bulk-add', (req, res) => {
  const { personIds, platoonId } = req.body;
  if (!personIds || !personIds.length || !platoonId) {
    return res.status(400).json({ error: 'Не указаны участники или взвод' });
  }
  const placeholders = personIds.map(() => '?').join(',');
  db.run(`UPDATE collection_people SET platoon_id = ? WHERE id IN (${placeholders})`, [platoonId, ...personIds], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Участники добавлены', count: this.changes });
  });
});

// Массовое удаление из взвода
router.post('/people/bulk-remove', (req, res) => {
  const { personIds } = req.body;
  if (!personIds || !personIds.length) {
    return res.status(400).json({ error: 'Не указаны участники' });
  }
  const placeholders = personIds.map(() => '?').join(',');
  db.run(`UPDATE collection_people SET platoon_id = NULL WHERE id IN (${placeholders})`, personIds, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Участники удалены', count: this.changes });
  });
});

// Автоматическое распределение (с проверкой наличия взводов)
router.post('/collections/:collectionId/auto-distribute', async (req, res) => {
  const { collectionId } = req.params;
  let { maxPerPlatoon, targetPlatoonsCount } = req.body;
  maxPerPlatoon = parseInt(maxPerPlatoon) || 31;
  targetPlatoonsCount = parseInt(targetPlatoonsCount) || null;

  // Проверяем, есть ли уже взвода в этом сборе
  const existingPlatoons = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM platoons WHERE collection_id = ?', [collectionId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.count : 0);
    });
  });
  if (existingPlatoons > 0) {
    return res.status(400).json({ error: 'Удалите все взводы для повторного автоматического распределения' });
  }

  try {
    // Получаем всех участников сбора с их школами
    const participants = await new Promise((resolve, reject) => {
      db.all(`
        SELECT p.id, p.full_name, s.edu_org as school
        FROM collection_people p
        JOIN collection_schools s ON p.school_id = s.id
        WHERE s.collection_id = ?
        ORDER BY p.id
      `, [collectionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!participants.length) {
      return res.status(400).json({ error: 'В сборе нет участников' });
    }

    // Группируем по школам
    const schoolGroups = {};
    for (const p of participants) {
      if (!schoolGroups[p.school]) schoolGroups[p.school] = [];
      schoolGroups[p.school].push(p);
    }

    const minPerPlatoon = 10;
    let platoonsToCreate = [];

    // Сначала обрабатываем большие школы (более maxPerPlatoon)
    for (const [school, people] of Object.entries(schoolGroups)) {
      let remaining = [...people];
      if (remaining.length > maxPerPlatoon) {
        let numPlatoons = Math.ceil(remaining.length / maxPerPlatoon);
        let size = Math.ceil(remaining.length / numPlatoons);
        if (size < minPerPlatoon && numPlatoons > 1) {
          size = Math.max(minPerPlatoon, Math.floor(remaining.length / numPlatoons));
          numPlatoons = Math.ceil(remaining.length / size);
        }
        for (let i = 0; i < numPlatoons; i++) {
          const chunk = remaining.splice(0, size);
          platoonsToCreate.push({ school, people: chunk });
        }
      } else {
        platoonsToCreate.push({ school, people: remaining });
      }
    }

    // Объединяем маленькие группы
    const smallGroups = platoonsToCreate.filter(g => g.people.length < minPerPlatoon);
    const largeGroups = platoonsToCreate.filter(g => g.people.length >= minPerPlatoon);
    let finalPlatoons = [...largeGroups];

    let tempPlatoon = { people: [], school: 'Смешанный' };
    for (const group of smallGroups) {
      if (tempPlatoon.people.length + group.people.length <= maxPerPlatoon) {
        tempPlatoon.people.push(...group.people);
      } else {
        if (tempPlatoon.people.length) finalPlatoons.push({ school: tempPlatoon.school, people: [...tempPlatoon.people] });
        tempPlatoon = { people: [...group.people], school: 'Смешанный' };
      }
    }
    if (tempPlatoon.people.length) finalPlatoons.push({ school: tempPlatoon.school, people: [...tempPlatoon.people] });

    // Если задано целевое количество взводов, перераспределяем равномерно
    if (targetPlatoonsCount && targetPlatoonsCount > 0) {
      const allPeople = participants.map(p => p);
      const total = allPeople.length;
      const numPlatoons = Math.min(targetPlatoonsCount, total);
      if (numPlatoons > 0) {
        const baseSize = Math.floor(total / numPlatoons);
        let remainder = total % numPlatoons;
        const newPlatoons = [];
        let start = 0;
        for (let i = 0; i < numPlatoons; i++) {
          let size = baseSize + (remainder > 0 ? 1 : 0);
          remainder--;
          const peopleSlice = allPeople.slice(start, start + size);
          newPlatoons.push({ school: `Взвод ${i+1}`, people: peopleSlice });
          start += size;
        }
        finalPlatoons = newPlatoons;
      }
    }

    // Удаляем старые взвода и сбрасываем platoon_id
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM platoons WHERE collection_id = ?', [collectionId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await new Promise((resolve, reject) => {
      db.run(`UPDATE collection_people SET platoon_id = NULL WHERE school_id IN (SELECT id FROM collection_schools WHERE collection_id = ?)`, [collectionId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Создаём новые взвода и распределяем участников
    for (let i = 0; i < finalPlatoons.length; i++) {
      const platoon = finalPlatoons[i];
      const platoonName = `ВЗВОД ${i+1}`;
      const platoonId = await new Promise((resolve, reject) => {
        db.run('INSERT INTO platoons (collection_id, name) VALUES (?, ?)', [collectionId, platoonName], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      const personIds = platoon.people.map(p => p.id);
      if (personIds.length === 0) continue;
      const placeholders = personIds.map(() => '?').join(',');
      await new Promise((resolve, reject) => {
        db.run(`UPDATE collection_people SET platoon_id = ? WHERE id IN (${placeholders})`, [platoonId, ...personIds], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ message: `Распределение завершено. Создано ${finalPlatoons.length} взводов.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка автоматического распределения' });
  }
});

module.exports = router;