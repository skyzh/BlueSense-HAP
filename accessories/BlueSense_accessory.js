const firebase = require('firebase');
const debug = require('debug')('accessory:bluesense');
const AQI = require('./AQI');

var config = {
  apiKey: "AIzaSyCC5ycqL95i8RwrdKGNLgLh8WQdw-70al8",
  authDomain: "bluesense-9e31b.firebaseapp.com",
  databaseURL: "https://bluesense-9e31b.firebaseio.com",
  projectId: "bluesense-9e31b",
  storageBucket: "bluesense-9e31b.appspot.com",
  messagingSenderId: "798683737619"
};

firebase.initializeApp(config);

const SENSOR = {
  temperature: 0,
  humidity: 0,
  pressure: 0,
  pm25: 0,
  pm10: 0,
  cb: () => 0
};

const dataRef = firebase.database().ref('/data');
const query = dataRef.orderByKey().limitToLast(1)
  .on('value', data => {
      data.forEach(snapshot => {
        snapshot = snapshot.val();
        SENSOR.temperature = snapshot.tc;
        SENSOR.humidity = snapshot.hum;
        SENSOR.pressure = snapshot.pressure;
        SENSOR.pm25 = snapshot.pm25;
        SENSOR.pm10 = snapshot.pm10;
        SENSOR.cb();
        debug(SENSOR);
      });
  });

const Accessory = require('../').Accessory;
const Service = require('../').Service;
const Characteristic = require('../').Characteristic;
const uuid = require('../').uuid;

const sensorUUID = uuid.generate('hap-nodejs:accessories:bluesense-sensor');
const sensor = exports.accessory = new Accessory('BlueSense Sensor', sensorUUID);

sensor.username = "C1:5D:3A:AE:5E:FA";
sensor.pincode = "031-45-154";

const convertToStatus = aqi => aqi >= 201
    ? 5 : aqi >= 151 
    ? 4 : aqi >= 101
    ? 3 : aqi >= 51
    ? 2 : 1;

sensor
  .addService(Service.TemperatureSensor)
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', cb => cb(null, SENSOR.temperature));
sensor
  .addService(Service.HumiditySensor)
  .getCharacteristic(Characteristic.CurrentRelativeHumidity)
  .on('get', cb => cb(null, SENSOR.humidity));
sensor
  .addService(Service.AirQualitySensor)
  .getCharacteristic(Characteristic.AirParticulateDensity)
  .on('get', cb => cb(null, SENSOR.pm25));
sensor.getService(Service.AirQualitySensor)
  .getCharacteristic(Characteristic.AirQuality)
  .on('get', cb => cb(null, convertToStatus(AQI(SENSOR.pm25, 'pm25'))));
sensor
  .getService(Service.AirQualitySensor)
  .getCharacteristic(Characteristic.AirParticulateSize)
  .on('get', cb => cb(null, 0.25));

SENSOR.cb = () => {
  sensor
    .getService(Service.TemperatureSensor)
    .setCharacteristic(Characteristic.CurrentTemperature, SENSOR.temperature);
  sensor
    .getService(Service.HumiditySensor)
    .setCharacteristic(Characteristic.CurrentRelativeHumidity, SENSOR.humidity);
  sensor
    .getService(Service.AirQualitySensor)
    .setCharacteristic(Characteristic.AirParticulateDensity, SENSOR.pm25)
    .setCharacteristic(Characteristic.AirQuality, convertToStatus(AQI(SENSOR.pm25, 'pm25')));
};
