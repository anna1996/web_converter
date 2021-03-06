'use strict'
var pg = require('pg');
var username = app.config.postgres.user;
var password = app.config.postgres.password;
var database = app.config.postgres.database;
var host = app.config.postgres.host;


module.exports = function (models) {
    var DataBase = models.DataBase;
    var Question = models.Question;

    Question.make = function (question_data, filename) {
        var ctx = {};

        return sequelize.transaction(function (t) {
            return DataBase.findOne({
                    where: {id: question_data.db_id},
                    transaction: t
                }).then(function (db) {
                    if (!db)
                        throw {message: 'DdNotExists'};

                    question_data.db_type = db.type;
                    return Question.create(question_data, {transaction: t});
                }).then(function(result) {
                    console.log('result', result);
                    return result;
                });
        });
    },

    Question.remove = function (question_id) {
        var ctx = {};
        console.log('question_id', question_id);

        return sequelize.transaction(function (t) {
            return Question.findOne({
                    where: {id: question_id},
                    transaction: t
                }).then(function (question) {
                    if (!question)
                        throw {message: 'DdDoNotExists'};

                    //если скрипт отработал корректно, то нужно удалить запись о базе из бд
                    return question.destroy();
                }).catch(function(err) {
                    console.log('remove db method err', err);
                    throw {message: err};
                });
        });
    }

   /* DataBase.get_schema = function (db_id) {
        var ctx = {};
        console.log('db_id', db_id);

        return DataBase.findById(db_id)
            .then(function (db) {
                if (!db)
                    throw {message: 'DdNotExists'};

                //выполнение команды по генерации схемы
                ctx.filename = db.id + Date.now() + '.png';
                return child_process.exec('./schemacrawler.sh -url="jdbc:postgresql://localhost/' 
                    + db.title + '" -u="' + username + '" -password="' + password + 
                    '" -i=maximum -c=schema -fmt=png -outputfile=../../static/db_schema/' 
                    + ctx.filename + ' -weakassociations=true', 
                    {cwd: "./schemacrawler-14.15.03-main/_schemacrawler"});
            }).then(function(result) {
                var stdout = result.stdout;
                var stderr = result.stderr;

                console.log('stdout', stdout);
                console.log('stderr', stderr);
                //если скрипт отработал корректно, то нужно вернуть название файла
                return ctx.filename;
            }).catch(function(err) {
                console.log('get db schema err', err);
                throw {message: err};
            });
    },

    DataBase.execute_sql = function (db_id, sql) {
        var ctx = {};
        console.log('db_id', db_id);

        return DataBase.findById(db_id)
            .then(function (db) {
                if (!db)
                    throw {message: 'DdNotExists'};
                ctx.db = db.dataValues;

                // подключение к бд для запроса данных из таблиц
                var conn_str = 'postgres://' + username + ':' + password + '@' +
                    host + '/' +  ctx.db.title;

                return new Promise(function (resolve, reject) {
                    pg.connect(conn_str, function(err, client, done) {
                        if (err) {
                            reject(err);
                        } else {
                            //console.log('Executing:', 'DROP DATABASE IF EXISTS ' + db.title);
                            client.query(sql, function(err, result) {
                                if (err) {
                                    done();
                                    reject(err);
                                } else {
                                    done();
                                    resolve(result);
                                }
                            });
                        }
                    });
                });

            }).then(function(result) {
                return {result: result, db: ctx.db, sql: sql};
            }).catch(function(err) {
                console.log('execute sql err', err);
                throw {message: err};
            });
    },

    DataBase.tables_data = function (db_id, tables) {
        var ctx = {};
        ctx.tables_data = [];

        return sequelize.transaction(function (t) {
            return DataBase.findOne({
                    where: {id: db_id},
                    include: [{
                        as: 'tables', 
                        model: Table,
                        attributes: ['title']
                    }],
                    transaction: t
                }).then(function (db) {
                    //console.log('db', db.dataValues);
                    if (!db)
                        throw {message: 'DdDoesNotExist'};
                    ctx.db = db.dataValues;
                    var tables = ctx.db.tables.map(table => table.dataValues.title);
                    console.log('tables', tables);

                    var queries = [];

                    // подключение к бд для запроса данных из таблиц
                    var conn_str = 'postgres://' + username + ':' + password + '@' +
                        host + '/' +  ctx.db.title;

                    return new Promise(function (resolve, reject) {
                        pg.connect(conn_str, function(err, client, done) {
                            if (err) {
                                reject(err);
                            } else {
                                var get_table_data = function(table_title) {
                                    return new Promise(function(resolve, reject)  {
                                        client.query("SELECT * FROM " + table_title + ";", function(err, res) {
                                            if (err) {
                                                reject(err);
                                            } else {
                                                ctx.tables_data.push({
                                                    title: table_title,
                                                    data: res.rows
                                                });
                                                resolve(res);
                                            }
                                        });
                                    });
                                };

                                Promise.all(tables.map(get_table_data))
                                    .then(function(res) {
                                        done();
                                        resolve(res);
                                    }).catch(function(err) {
                                        done();
                                        reject(err);
                                    });
                            }
                        });
                    });
                }).then(function(result) {
                    console.log('result get tables data', result);
                    return  {tables_data: ctx.tables_data, db_id: ctx.db.id};
                }).catch(function(err) {
                    console.log('get tables data err', err);
                    throw {message: err};
                });
        });
    },

    DataBase.remove = function (db_id) {
        var ctx = {};
        console.log('db_id', db_id);

        return sequelize.transaction(function (t) {
            return DataBase.findOne({
                    where: {id: db_id},
                    transaction: t
                }).then(function (db) {
                    if (!db)
                        throw {message: 'DdDoNotExists'};
                    ctx.db = db;

                    var conn_str = 'postgres://' + username + ':' + password + '@' + host + '/postgres';

                    return new Promise(function (resolve, reject) {
                        pg.connect(conn_str, function(err, client, done) {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('Executing:', 'DROP DATABASE IF EXISTS ' + db.title);
                                client.query('DROP DATABASE IF EXISTS ' + db.title, function(err) {
                                    if (err) {
                                        done();
                                        console.log('0 init_db error\n', err.stack);
                                        reject(err);
                                    } else {
                                        done();
                                        resolve();
                                    }
                                });
                            }
                        });
                    });
                    //выполняем команду dropdb
                    //return child_process.exec('dropdb -U ' + username + ' -W ' + password + 
                    //        ' ' + db.title + ';');
                }).then(function(result) {
                    //если скрипт отработал корректно, то нужно удалить запись о базе из бд
                    return ctx.db.destroy();
                }).catch(function(err) {
                    console.log('remove db method err', err);
                    throw {message: err};
                });
        });
    }*/


};
