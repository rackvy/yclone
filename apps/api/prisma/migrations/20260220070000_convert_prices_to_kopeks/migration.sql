-- Конвертируем существующие цены услуг из рублей в копейки (умножаем на 100)
UPDATE "ServicePriceByRank" SET price = price * 100;

-- Конвертируем существующие цены товаров из рублей в копейки (если есть старые данные)
-- UPDATE "Product" SET price = price * 100 WHERE price < 100000;
