-- Откатываем цены услуг из копеек обратно в рубли (делим на 100)
UPDATE "ServicePriceByRank" SET price = price / 100;
