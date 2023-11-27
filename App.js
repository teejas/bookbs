import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
let marcData = require('./marc_example.json')

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(true);
  const [bookData, setBookData] = useState("");

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    // alert(`Bar code with type ${type} and data ${data} has been scanned!`);
    // should look up isbn and add biblio+item using marc record
    let url = "https://api2.isbndb.com/book/" + data;
    console.log("URL is: " + url);
    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Authorization': process.env.EXPO_PUBLIC_ISBNDB_APIKEY
      }
    })
    .then( res => res.json() )
    .then( body => {
      console.log(body);
      let author = body.book.authors[0].toUpperCase();
      let publisher = body.book.publisher.toUpperCase();
      let publishDate = body.book.date_published;
      let title = body.book.title.toUpperCase();
      setBookData(`${data}/${title}/${author}/${publisher}/${publishDate}`);
    })
    .catch( err => {
      console.error("ERROR: " + err);
    })
  };

  const pushMARCRecord = () => {
    console.log(bookData);
    console.log(marcData);
    let url = "https://koha-intra.tejas.wtf/api/v1/biblios/"
    marcData["fields"][2]["020"]["subfields"][0]["a"] = bookData.split("/")[0];
    marcData["fields"][4]["245"]["subfields"][0]["a"] = bookData.split("/")[1];
    marcData["fields"][3]["100"]["subfields"][0]["a"] = bookData.split("/")[2];
    marcData["fields"][5]["260"]["subfields"][0]["b"] = bookData.split("/")[3];
    marcData["fields"][5]["260"]["subfields"][1]["c"] = bookData.split("/")[4];
    console.log(marcData);
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/marc-in-json',
        'Content-Type': 'application/marc-in-json',
        'Authorization': 'Basic ' + process.env.EXPO_PUBLIC_KOHA_APIKEY
      },
      body: JSON.stringify(marcData)
    })
    .then( res => console.log(res.json()))
    .catch( err => {
      console.error(err);
    })
  }

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.data}>
        {
          bookData.split("/").map((data, index) => (
            <Text key={index} style={styles.dataText}>{data}</Text>
          ))
        }
        {bookData != "" && <Button title={'Submit MARC Record'} onPress={() => pushMARCRecord()} />}
      </View>
      {
        scanned ? 
          <Button title={'Tap to Scan'} onPress={() => setScanned(false)} />
          :
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  data: {
    padding: 30,
  },
  dataText: {
    color: 'white',
  },
  container: {
    backgroundColor: 'black',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
});
