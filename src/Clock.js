import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Container, Box, TextField, Typography, Snackbar, Alert } from '@mui/material';

function Clock() {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const inputRef = document.getElementById('qr-input');
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        const scannedValue = e.target.value.trim();
        if (scannedValue) {
          handleClockIn(scannedValue);
          setInput('');
        }
      }
    };
    inputRef?.addEventListener('keypress', handleKeyPress);
    return () => inputRef?.removeEventListener('keypress', handleKeyPress);
  }, []);

  const handleClockIn = async (userId) => {
    try {
      await addDoc(collection(db, 'clockings'), {
        userId,
        timestamp: serverTimestamp(),
        method: 'in', // or 'out' → 改良可
        verifiedBy: auth.currentUser?.email || 'unknown',
        type: 'qr'
      });
      setMessage(`打刻完了：${userId}`);
      setOpen(true);
    } catch (error) {
      setMessage('打刻エラーが発生しました');
      setOpen(true);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Typography variant="h5" gutterBottom>QR打刻画面</Typography>
        <TextField
          id="qr-input"
          label="QRコードをスキャンしてください"
          fullWidth
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </Box>
      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>{message}</Alert>
      </Snackbar>
    </Container>
  );
}

export default Clock;
